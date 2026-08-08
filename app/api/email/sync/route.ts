import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer,googleAccessToken} from "@/lib/googleServer";

function decodeBase64Url(value:string){return Buffer.from(value.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8")}
function textFromPayload(payload:any):string{
 if(!payload)return "";
 if(payload.mimeType==="text/plain"&&payload.body?.data)return decodeBase64Url(payload.body.data);
 for(const part of payload.parts||[]){const t=textFromPayload(part);if(t)return t}
 return "";
}
function header(headers:any[],name:string){return headers?.find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value||""}
function senderEmail(from:string){const m=from.match(/<([^>]+)>/);return m?m[1]:from.trim()}

export async function POST(req:NextRequest){
 try{
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const access=await googleAccessToken(user.id);
  const listUrl=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q","in:inbox newer_than:7d -category:promotions -in:spam -in:trash");
  listUrl.searchParams.set("maxResults","25");
  const listRes=await fetch(listUrl,{headers:{Authorization:`Bearer ${access}`}});
  const list=await listRes.json(); if(!listRes.ok)throw new Error(list.error?.message||"Gmail search failed.");
  const admin=adminClient();
  const {data:projects}=await admin.from("projects").select("id,name,summary").eq("user_id",user.id);
  const projectContext=(projects||[]).map((p:any)=>({id:p.id,name:p.name,summary:p.summary})).slice(0,50);
  const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
  let saved=0;
  for(const ref of list.messages||[]){
   const msgRes=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,{headers:{Authorization:`Bearer ${access}`}});
   if(!msgRes.ok)continue; const msg=await msgRes.json();
   const from=header(msg.payload?.headers||[],"From"), subject=header(msg.payload?.headers||[],"Subject");
   const body=textFromPayload(msg.payload).slice(0,18000), snippet=msg.snippet||"";
   let triage:any={triage_category:"Review",priority:"Medium",why_it_matters:"",suggested_action:"",project_id:null,waiting_on:false,commitment_detected:""};
   if(client){
    const response=await client.responses.create({
     model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
     instructions:"You triage research-program email for Arthur Villordon. Return JSON only with fields triage_category, priority, why_it_matters, suggested_action, project_id, waiting_on, commitment_detected. Categories: Needs reply, Needs action, Project update, FYI, Administrative, Low priority. priority must High, Medium, or Low. Match project_id only when clearly supported by the supplied project list. commitment_detected should briefly describe a promise Arthur appears to have made or an action explicitly requested of him; otherwise empty. Be conservative and do not label legitimate mail as junk.",
     input:`PROJECTS:\n${JSON.stringify(projectContext)}\n\nEMAIL\nFrom: ${from}\nSubject: ${subject}\nBody:\n${body||snippet}`
    });
    try{const txt=response.output_text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();triage={...triage,...JSON.parse(txt.slice(txt.indexOf("{"),txt.lastIndexOf("}")+1))}}catch{}
   }
   const {error}=await admin.from("email_items").upsert({
    user_id:user.id,gmail_message_id:msg.id,gmail_thread_id:msg.threadId,
    sender:from,sender_email:senderEmail(from),subject,
    received_at:new Date(Number(msg.internalDate)).toISOString(),
    snippet,body_text:body||snippet,
    triage_category:triage.triage_category||"Review",
    priority:["High","Medium","Low"].includes(triage.priority)?triage.priority:"Medium",
    project_id:triage.project_id||null,why_it_matters:triage.why_it_matters||"",
    suggested_action:triage.suggested_action||"",waiting_on:Boolean(triage.waiting_on),
    commitment_detected:triage.commitment_detected||""
   },{onConflict:"user_id,gmail_message_id"});
   if(!error)saved++;
  }
  return NextResponse.json({saved});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

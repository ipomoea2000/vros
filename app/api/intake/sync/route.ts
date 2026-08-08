import OpenAI from "openai";
import { simpleParser } from "mailparser";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, currentUserFromBearer, googleAccessToken } from "@/lib/googleServer";

function decode64(value:string){return Buffer.from(value.replace(/-/g,"+").replace(/_/g,"/"),"base64")}
function header(headers:any[],name:string){return headers?.find(h=>String(h.name).toLowerCase()===name.toLowerCase())?.value||""}

function attachmentParts(payload:any):any[]{
  const out:any[]=[];
  function walk(part:any){
    if(!part)return;
    const filename=String(part.filename||"").toLowerCase();
    if((part.mimeType==="message/rfc822" || filename.endsWith(".eml")) && part.body?.attachmentId) out.push(part);
    for(const child of part.parts||[])walk(child);
  }
  walk(payload); return out;
}

export async function POST(req:NextRequest){
 try{
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const access=await googleAccessToken(user.id);
  const admin=adminClient();

  const listUrl=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q","in:inbox newer_than:14d has:attachment -in:spam -in:trash");
  listUrl.searchParams.set("maxResults","50");
  const listRes=await fetch(listUrl,{headers:{Authorization:`Bearer ${access}`}});
  const list=await listRes.json();
  if(!listRes.ok)throw new Error(list.error?.message||"Could not search Gmail intake.");

  const {data:projects}=await admin.from("projects")
    .select("id,name,summary,last_decision,next_action").eq("user_id",user.id);
  const projectContext=(projects||[]).slice(0,70);
  const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;

  let wrappers=0, originals=0, saved=0, skipped=0;

  for(const ref of list.messages||[]){
    const msgRes=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
      {headers:{Authorization:`Bearer ${access}`}});
    if(!msgRes.ok)continue;
    const wrapper=await msgRes.json();
    const parts=attachmentParts(wrapper.payload);
    if(!parts.length){skipped++;continue}
    wrappers++;

    for(let index=0;index<parts.length;index++){
      const part=parts[index];
      const attRes=await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${wrapper.id}/attachments/${part.body.attachmentId}`,
        {headers:{Authorization:`Bearer ${access}`}}
      );
      if(!attRes.ok)continue;
      const att=await attRes.json();
      if(!att.data)continue;

      const parsed=await simpleParser(decode64(att.data));
      originals++;

      const from=parsed.from?.text||"";
      const fromAddress=parsed.from?.value?.[0]?.address||"";
      const subject=parsed.subject||"(no subject)";
      const body=(parsed.text || (typeof parsed.html==="string"?parsed.html.replace(/<[^>]+>/g," "):""))
        .replace(/\s+/g," ").trim().slice(0,24000);
      const receivedAt=(parsed.date||new Date(Number(wrapper.internalDate))).toISOString();
      const recordId=`${wrapper.id}:${index}`;

      let triage:any={
        triage_category:"Review",priority:"Medium",why_it_matters:"",
        suggested_action:"",project_id:null,waiting_on:false,commitment_detected:""
      };

      if(client){
        const response=await client.responses.create({
          model:process.env.OPENAI_MODEL||"gpt-5-mini",
          store:false,
          instructions:
            "You are the email triage layer for AROS, Arthur Villordon's research operating system. " +
            "This is an ORIGINAL LSU/AgCenter email extracted from a forwarded .eml attachment. " +
            "Return JSON only with triage_category, priority, why_it_matters, suggested_action, project_id, waiting_on, commitment_detected. " +
            "Categories: Needs reply, Needs action, Project update, FYI, Administrative, Low priority. " +
            "priority must be High, Medium, or Low. " +
            "Match project_id only when the project relationship is clear from the supplied portfolio. " +
            "waiting_on is true only when someone else has clearly promised or owes Arthur a deliverable. " +
            "commitment_detected should describe a clear action Arthur agreed or is explicitly asked to take, otherwise empty. " +
            "Be conservative and do not treat ordinary legitimate institutional mail as junk.",
          input:`AROS PROJECTS:\n${JSON.stringify(projectContext)}\n\nORIGINAL EMAIL\nFrom: ${from}\nSubject: ${subject}\nDate: ${receivedAt}\nBody:\n${body}`
        });
        try{
          const t=response.output_text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
          const j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));
          triage={...triage,...j};
        }catch{}
      }

      const wrapperFrom=header(wrapper.payload?.headers||[],"From");
      const wrapperSubject=header(wrapper.payload?.headers||[],"Subject");
      const {error}=await admin.from("email_items").upsert({
        user_id:user.id,
        gmail_message_id:recordId,
        gmail_thread_id:wrapper.threadId||null,
        sender:from,
        sender_email:fromAddress,
        subject,
        received_at:receivedAt,
        snippet:body.slice(0,400),
        body_text:body,
        triage_category:triage.triage_category||"Review",
        priority:["High","Medium","Low"].includes(triage.priority)?triage.priority:"Medium",
        project_id:triage.project_id||null,
        why_it_matters:triage.why_it_matters||"",
        suggested_action:triage.suggested_action||"",
        waiting_on:Boolean(triage.waiting_on),
        commitment_detected:triage.commitment_detected||"",
        status:"open"
      },{onConflict:"user_id,gmail_message_id"});
      if(!error)saved++;
    }
  }

  return NextResponse.json({wrappers,originals,saved,skipped});
 }catch(e:any){
  return NextResponse.json({error:e?.message||"Intake sync failed."},{status:400});
 }
}

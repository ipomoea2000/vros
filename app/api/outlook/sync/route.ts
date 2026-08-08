import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {graphAccessToken,msAdminClient,msCurrentUser} from "@/lib/microsoftServer";

function stripHtml(html:string){return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim()}

export async function POST(req:NextRequest){
 try{
  const user=await msCurrentUser(req.headers.get("authorization"));
  const access=await graphAccessToken(user.id);
  const since=new Date(Date.now()-7*86400000).toISOString();
  const url=new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages");
  url.searchParams.set("$select","id,conversationId,subject,from,receivedDateTime,bodyPreview,body,importance,isRead");
  url.searchParams.set("$filter",`receivedDateTime ge ${since}`);
  url.searchParams.set("$orderby","receivedDateTime desc");
  url.searchParams.set("$top","25");
  const res=await fetch(url,{headers:{Authorization:`Bearer ${access}`,Prefer:'outlook.body-content-type="html"'}});
  const data=await res.json();if(!res.ok)throw new Error(data.error?.message||"Microsoft Graph inbox read failed.");
  const admin=msAdminClient();
  const {data:projects}=await admin.from("projects").select("id,name,summary,last_decision,next_action").eq("user_id",user.id);
  const projectContext=(projects||[]).slice(0,60);
  const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
  let saved=0;
  for(const m of data.value||[]){
   const body=stripHtml(m.body?.content||m.bodyPreview||"").slice(0,18000);
   let triage:any={triage_category:"Review",priority:m.importance==="high"?"High":"Medium",why_it_matters:"",suggested_action:"",project_id:null,waiting_on:false,commitment_detected:""};
   if(client){
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
      instructions:"Triage an LSU AgCenter research email for Arthur Villordon. Return JSON only with triage_category, priority, why_it_matters, suggested_action, project_id, waiting_on, commitment_detected. Categories: Needs reply, Needs action, Project update, FYI, Administrative, Low priority. priority: High, Medium, Low. Match project_id only if clearly supported by the supplied project list. waiting_on is true only if the sender indicates they will provide something Arthur needs. commitment_detected describes a clear commitment Arthur has made or an explicit action requested of him; otherwise empty. Be conservative: do not call legitimate administrative or research mail junk.",
      input:`PROJECTS:\n${JSON.stringify(projectContext)}\n\nEMAIL\nFrom: ${m.from?.emailAddress?.name||""} <${m.from?.emailAddress?.address||""}>\nSubject: ${m.subject||""}\nBody:\n${body}`
    });
    try{
      const t=response.output_text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
      triage={...triage,...JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1))}
    }catch{}
   }
   const {error}=await admin.from("email_items").upsert({
    user_id:user.id,
    gmail_message_id:m.id,
    gmail_thread_id:m.conversationId,
    sender:m.from?.emailAddress?.name||"",
    sender_email:m.from?.emailAddress?.address||"",
    subject:m.subject||"",
    received_at:m.receivedDateTime,
    snippet:m.bodyPreview||"",
    body_text:body,
    triage_category:triage.triage_category||"Review",
    priority:["High","Medium","Low"].includes(triage.priority)?triage.priority:"Medium",
    project_id:triage.project_id||null,
    why_it_matters:triage.why_it_matters||"",
    suggested_action:triage.suggested_action||"",
    waiting_on:Boolean(triage.waiting_on),
    commitment_detected:triage.commitment_detected||""
   },{onConflict:"user_id,gmail_message_id"});
   if(!error)saved++;
  }
  return NextResponse.json({saved});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

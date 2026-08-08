import crypto from "crypto";
import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer,googleAccessToken} from "@/lib/googleServer";

function extractDocId(url:string){return url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1]||null}
function docText(doc:any){
 const out:string[]=[];
 const walk=(node:any)=>{
  if(node?.textRun?.content)out.push(node.textRun.content);
  for(const key of ["body","content","paragraph","elements","table","tableRows","tableCells","tabs","childTabs","documentTab"]){
   const val=node?.[key]; if(Array.isArray(val))val.forEach(walk); else if(val&&typeof val==="object")walk(val);
  }
 };
 walk(doc); return out.join("").replace(/\n{3,}/g,"\n\n").slice(0,120000);
}
export async function POST(req:NextRequest){
 try{
  const {user}=await currentUserFromBearer(req.headers.get("authorization")); const {watchId}=await req.json();
  const admin=adminClient(); const {data:w,error}=await admin.from("proposal_watches").select("*").eq("id",watchId).eq("user_id",user.id).single();
  if(error||!w)throw new Error("Proposal watch not found.");
  const fileId=w.google_file_id||extractDocId(w.source_url); if(!fileId)throw new Error("Could not identify the Google Doc ID from this URL.");
  const access=await googleAccessToken(user.id);
  const [metaRes,docRes]=await Promise.all([
   fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime`,{headers:{Authorization:`Bearer ${access}`}}),
   fetch(`https://docs.googleapis.com/v1/documents/${fileId}?includeTabsContent=true`,{headers:{Authorization:`Bearer ${access}`}})
  ]);
  const meta=await metaRes.json(),doc=await docRes.json();
  if(!metaRes.ok)throw new Error(meta.error?.message||"Could not read Drive metadata.");
  if(!docRes.ok)throw new Error(doc.error?.message||"Could not read Google Doc.");
  const text=docText(doc); const hash=crypto.createHash("sha256").update(text).digest("hex");
  const changed=Boolean(w.last_content_hash&&w.last_content_hash!==hash);
  let summary="",significance="",requiresAttention=false;
  if(changed&&process.env.OPENAI_API_KEY){
   const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
   const response=await client.responses.create({
    model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
    instructions:"Compare two versions of a collaborative grant proposal. Return JSON only with summary, significance, requires_attention. summary should identify meaningful changes, not formatting noise. significance should explain why the change matters to the project or proposal. requires_attention must be boolean. Do not invent changes.",
    input:`PREVIOUS VERSION:\n${String(w.last_snapshot||"").slice(0,50000)}\n\nCURRENT VERSION:\n${text.slice(0,50000)}`
   });
   try{const t=response.output_text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();const j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));summary=j.summary||"";significance=j.significance||"";requiresAttention=Boolean(j.requires_attention)}catch{}
  }
  if(changed){
   await admin.from("proposal_changes").insert({user_id:user.id,watch_id:w.id,project_id:w.project_id,modified_time:meta.modifiedTime,summary:summary||"Document content changed.",significance,requires_attention:requiresAttention,previous_hash:w.last_content_hash,current_hash:hash});
  }
  await admin.from("proposal_watches").update({google_file_id:fileId,last_modified_time:meta.modifiedTime,last_content_hash:hash,last_snapshot:text}).eq("id",w.id);
  return NextResponse.json({changed,modifiedTime:meta.modifiedTime,summary,significance,requiresAttention});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

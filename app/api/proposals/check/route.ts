import crypto from "crypto";
import OpenAI from "openai";
import mammoth from "mammoth";
import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer,googleAccessToken} from "@/lib/googleServer";

function extractFileId(url:string){
  return (
    url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ||
    null
  );
}

function googleDocText(doc:any){
  const out:string[]=[];
  const walk=(node:any)=>{
    if(node?.textRun?.content)out.push(node.textRun.content);
    for(const key of ["body","content","paragraph","elements","table","tableRows","tableCells","tabs","childTabs","documentTab"]){
      const val=node?.[key];
      if(Array.isArray(val))val.forEach(walk);
      else if(val&&typeof val==="object")walk(val);
    }
  };
  walk(doc);
  return out.join("").replace(/\n{3,}/g,"\n\n").slice(0,120000);
}

async function readNativeGoogleDoc(fileId:string,access:string){
  const res=await fetch(`https://docs.googleapis.com/v1/documents/${fileId}?includeTabsContent=true`,{
    headers:{Authorization:`Bearer ${access}`}
  });
  const doc=await res.json();
  if(!res.ok)throw new Error(doc.error?.message||"Could not read Google Doc.");
  return googleDocText(doc);
}

async function readWordDocx(fileId:string,access:string){
  const res=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{
    headers:{Authorization:`Bearer ${access}`}
  });
  if(!res.ok){
    let detail="Could not download the Office document from Google Drive.";
    try{const j=await res.json(); detail=j.error?.message||detail}catch{}
    throw new Error(detail);
  }
  const arrayBuffer=await res.arrayBuffer();
  const result=await mammoth.extractRawText({buffer:Buffer.from(arrayBuffer)});
  return result.value.replace(/\n{3,}/g,"\n\n").slice(0,120000);
}

async function extractText(fileId:string,mimeType:string,access:string){
  if(mimeType==="application/vnd.google-apps.document"){
    return {text:await readNativeGoogleDoc(fileId,access),sourceKind:"Native Google Doc"};
  }
  if(mimeType==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    return {text:await readWordDocx(fileId,access),sourceKind:"Word document in Google Drive"};
  }
  if(mimeType==="application/msword"){
    throw new Error("This proposal is an older .doc Word file. Save or upload it as .docx, or convert it to a native Google Doc, then check again.");
  }
  throw new Error(`Proposal Watch currently supports native Google Docs and .docx Word files. This file is ${mimeType||"an unsupported type"}.`);
}

export async function POST(req:NextRequest){
 try{
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const {watchId}=await req.json();
  const admin=adminClient();

  const {data:w,error}=await admin.from("proposal_watches")
    .select("*").eq("id",watchId).eq("user_id",user.id).single();
  if(error||!w)throw new Error("Proposal watch not found.");

  const fileId=w.google_file_id||extractFileId(w.source_url);
  if(!fileId)throw new Error("Could not identify the Google Drive file ID from this URL.");

  const access=await googleAccessToken(user.id);

  const metaRes=await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,mimeType,size`,
    {headers:{Authorization:`Bearer ${access}`}}
  );
  const meta=await metaRes.json();
  if(!metaRes.ok)throw new Error(meta.error?.message||"Could not read Google Drive metadata.");

  const extracted=await extractText(fileId,meta.mimeType,access);
  const text=extracted.text;
  if(!text.trim())throw new Error("AROS could access the file but could not extract readable proposal text.");

  const hash=crypto.createHash("sha256").update(text).digest("hex");
  const changed=Boolean(w.last_content_hash&&w.last_content_hash!==hash);
  const firstCheck=!w.last_content_hash;
  let summary="",significance="",requiresAttention=false;

  if(changed&&process.env.OPENAI_API_KEY){
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5-mini",
      store:false,
      instructions:
        "Compare two versions of a collaborative grant proposal. Return JSON only with summary, significance, requires_attention. " +
        "summary should identify meaningful substantive changes, not formatting noise. " +
        "significance should explain why the change matters to the proposal or linked project. " +
        "requires_attention must be boolean. Do not invent changes or infer edits that are not supported by the text.",
      input:`PREVIOUS VERSION:\n${String(w.last_snapshot||"").slice(0,50000)}\n\nCURRENT VERSION:\n${text.slice(0,50000)}`
    });
    try{
      const t=response.output_text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
      const j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));
      summary=j.summary||"";
      significance=j.significance||"";
      requiresAttention=Boolean(j.requires_attention);
    }catch{}
  }

  if(changed){
    await admin.from("proposal_changes").insert({
      user_id:user.id,
      watch_id:w.id,
      project_id:w.project_id,
      modified_time:meta.modifiedTime,
      summary:summary||"Document content changed.",
      significance,
      requires_attention:requiresAttention,
      previous_hash:w.last_content_hash,
      current_hash:hash
    });
  }

  await admin.from("proposal_watches").update({
    google_file_id:fileId,
    last_modified_time:meta.modifiedTime,
    last_content_hash:hash,
    last_snapshot:text
  }).eq("id",w.id);

  return NextResponse.json({
    changed,
    firstCheck,
    modifiedTime:meta.modifiedTime,
    summary,
    significance,
    requiresAttention,
    sourceKind:extracted.sourceKind,
    fileName:meta.name
  });
 }catch(e:any){
  return NextResponse.json({error:e.message},{status:400})
 }
}

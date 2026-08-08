import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer} from "@/lib/googleServer";

export async function POST(req:NextRequest){
 try{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured.");
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const {emailId}=await req.json();
  const admin=adminClient();
  const {data:e,error}=await admin.from("email_items")
    .select("*,projects(name,summary,last_decision,next_action)")
    .eq("id",emailId).eq("user_id",user.id).single();
  if(error||!e)throw new Error("Email record not found.");

  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
    model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
    instructions:
      "Draft a concise professional email response for Arthur Villordon at LSU AgCenter. " +
      "This response will be manually reviewed and sent from LSU Outlook. " +
      "Use a warm, direct, collegial tone. Do not invent commitments, dates, results, attachments, or decisions. " +
      "Use supplied project context only when relevant. If simple acknowledgement is enough, keep it short. " +
      "Return only the draft email body, with no subject line and no commentary.",
    input:`PROJECT CONTEXT:\n${JSON.stringify(e.projects||{})}\n\nORIGINAL EMAIL\nFrom: ${e.sender} <${e.sender_email}>\nSubject: ${e.subject}\n${e.body_text}\n\nAROS SUGGESTED ACTION:\n${e.suggested_action||""}`
  });
  await admin.from("email_items").update({draft_response:response.output_text}).eq("id",e.id);
  return NextResponse.json({draft:response.output_text});
 }catch(e:any){
  return NextResponse.json({error:e?.message||"Could not draft response."},{status:400});
 }
}

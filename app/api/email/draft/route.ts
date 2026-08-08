import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer} from "@/lib/googleServer";
export async function POST(req:NextRequest){
 try{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured.");
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const {emailId}=await req.json();
  const admin=adminClient();
  const {data:email,error}=await admin.from("email_items").select("*,projects(name,summary,last_decision,next_action)").eq("id",emailId).eq("user_id",user.id).single();
  if(error||!email)throw new Error("Email record not found.");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
   model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
   instructions:"Draft a concise professional email response for Arthur Villordon. Preserve a warm, direct, collegial tone. Do not invent commitments, dates, data, or decisions. If the message only needs acknowledgement, keep it brief. Return only the draft body, no subject line and no commentary.",
   input:`PROJECT CONTEXT:\n${JSON.stringify(email.projects||{})}\n\nEMAIL FROM ${email.sender}\nSUBJECT: ${email.subject}\n${email.body_text}\n\nTRIAGE NOTE: ${email.suggested_action||""}`
  });
  await admin.from("email_items").update({draft_response:response.output_text}).eq("id",email.id);
  return NextResponse.json({draft:response.output_text});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

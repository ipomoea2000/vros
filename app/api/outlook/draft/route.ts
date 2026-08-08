import OpenAI from "openai";
import {NextRequest,NextResponse} from "next/server";
import {msAdminClient,msCurrentUser} from "@/lib/microsoftServer";
export async function POST(req:NextRequest){
 try{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured.");
  const user=await msCurrentUser(req.headers.get("authorization"));
  const {emailId}=await req.json();const admin=msAdminClient();
  const {data:e,error}=await admin.from("email_items").select("*,projects(name,summary,last_decision,next_action)").eq("id",emailId).eq("user_id",user.id).single();
  if(error||!e)throw new Error("Email record not found.");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
   model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,
   instructions:"Draft a concise professional response for Arthur Villordon at LSU AgCenter. Use a warm, direct, collegial style. Do not invent dates, commitments, results, or decisions. If acknowledgement is sufficient, keep it short. Return only the email body.",
   input:`PROJECT CONTEXT:\n${JSON.stringify(e.projects||{})}\n\nEMAIL FROM: ${e.sender} <${e.sender_email}>\nSUBJECT: ${e.subject}\n${e.body_text}\n\nAROS TRIAGE: ${e.suggested_action||""}`
  });
  await admin.from("email_items").update({draft_response:response.output_text}).eq("id",e.id);
  return NextResponse.json({draft:response.output_text});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

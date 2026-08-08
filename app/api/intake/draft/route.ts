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
      "Use a warm, direct, collegial tone and prefer the shortest response that adequately addresses the sender's request. " +
      "Use relevant AROS project context to make the response informed and specific, but never invent or commit Arthur to meetings, calls, deadlines not stated in the source message, creating documents, assigning or reassigning work, sending files or data, completing future actions, or decisions not already supported by the email or project context. " +
      "Project context may inform what the response discusses, but must not be used to invent what Arthur will do. " +
      "Do not invent dates, results, attachments, collaborators' positions, or decisions. " +
      "When the sender's requested action is clear, respond directly and do not introduce clarification questions unless ambiguity actually prevents a reasonable response. " +
      "Do not expand a simple request into technical subquestions merely because related project context is available. " +
      "Mirror the scale of the incoming email: short, straightforward messages should normally receive short, straightforward replies. " +
      "Do not demonstrate project expertise for its own sake; use context only when it helps answer the sender efficiently. " +
      "Before finalizing, remove any new work, questions, decisions, or commitments that are not necessary to answer the sender. " +
      "When the request truly cannot be answered reasonably without clarification, ask only the minimum necessary question. " +
      "Use bullets only when the incoming email clearly benefits from them. " +
      "Return only the draft email body, with no subject line and no commentary.",
    input:`PROJECT CONTEXT:\n${JSON.stringify(e.projects||{})}\n\nORIGINAL EMAIL\nFrom: ${e.sender} <${e.sender_email}>\nSubject: ${e.subject}\n${e.body_text}\n\nAROS SUGGESTED ACTION:\n${e.suggested_action||""}`
  });
  await admin.from("email_items").update({draft_response:response.output_text}).eq("id",e.id);
  return NextResponse.json({draft:response.output_text});
 }catch(e:any){
  return NextResponse.json({error:e?.message||"Could not draft response."},{status:400});
 }
}

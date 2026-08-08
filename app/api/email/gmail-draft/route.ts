import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer,googleAccessToken} from "@/lib/googleServer";
function enc(s:string){return Buffer.from(s,"utf8").toString("base64url")}
export async function POST(req:NextRequest){
 try{
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const {emailId}=await req.json(); const admin=adminClient();
  const {data:e,error}=await admin.from("email_items").select("*").eq("id",emailId).eq("user_id",user.id).single();
  if(error||!e||!e.draft_response)throw new Error("Generate and review the AROS draft first.");
  const access=await googleAccessToken(user.id);
  const subject=/^re:/i.test(e.subject||"")?e.subject:`Re: ${e.subject||""}`;
  const raw=[`To: ${e.sender_email}`,`Subject: ${subject}`,`In-Reply-To: ${e.gmail_message_id}`,`References: ${e.gmail_message_id}`,"Content-Type: text/plain; charset=UTF-8","",e.draft_response].join("\r\n");
  const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts",{method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({message:{threadId:e.gmail_thread_id,raw:enc(raw)}})});
  const result=await res.json(); if(!res.ok)throw new Error(result.error?.message||"Could not create Gmail draft.");
  return NextResponse.json({ok:true,draftId:result.id});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

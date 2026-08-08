import {NextRequest,NextResponse} from "next/server";
import {graphAccessToken,msAdminClient,msCurrentUser} from "@/lib/microsoftServer";
export async function POST(req:NextRequest){
 try{
  const user=await msCurrentUser(req.headers.get("authorization"));
  const {emailId}=await req.json();const admin=msAdminClient();
  const {data:e,error}=await admin.from("email_items").select("*").eq("id",emailId).eq("user_id",user.id).single();
  if(error||!e||!e.draft_response)throw new Error("Generate and review the AROS response first.");
  const access=await graphAccessToken(user.id);
  const create=await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(e.gmail_message_id)}/createReply`,{
    method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:"{}"
  });
  const draft=await create.json();
  if(!create.ok)throw new Error(draft.error?.message||"Could not create Outlook reply draft.");
  const update=await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(draft.id)}`,{
    method:"PATCH",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},
    body:JSON.stringify({body:{contentType:"Text",content:e.draft_response}})
  });
  if(!update.ok){const x=await update.json();throw new Error(x.error?.message||"Could not update Outlook draft.");}
  return NextResponse.json({ok:true,draftId:draft.id});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

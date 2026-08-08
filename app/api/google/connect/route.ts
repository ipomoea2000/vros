import crypto from "crypto";
import { NextRequest,NextResponse } from "next/server";
import { adminClient,currentUserFromBearer,googleConfigured } from "@/lib/googleServer";

const scopes=[
 "openid","email",
 "https://www.googleapis.com/auth/gmail.readonly",
 "https://www.googleapis.com/auth/documents.readonly",
 "https://www.googleapis.com/auth/drive.metadata.readonly"
];

export async function POST(req:NextRequest){
 try{
  if(!googleConfigured()) return NextResponse.json({error:"Google OAuth environment variables are not configured."},{status:503});
  const {user}=await currentUserFromBearer(req.headers.get("authorization"));
  const state=crypto.randomBytes(24).toString("base64url");
  await adminClient().from("google_oauth_states").insert({state,user_id:user.id,expires_at:new Date(Date.now()+10*60_000).toISOString()});
  const params=new URLSearchParams({
   client_id:process.env.GOOGLE_CLIENT_ID!,
   redirect_uri:`${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
   response_type:"code",access_type:"offline",prompt:"consent",
   scope:scopes.join(" "),state,include_granted_scopes:"true"
  });
  return NextResponse.json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

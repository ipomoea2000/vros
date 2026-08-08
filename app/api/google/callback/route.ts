import { NextRequest,NextResponse } from "next/server";
import { adminClient,encryptToken } from "@/lib/googleServer";

export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get("code"), state=req.nextUrl.searchParams.get("state");
 const app=process.env.NEXT_PUBLIC_APP_URL || "/";
 try{
  if(!code||!state) throw new Error("Missing OAuth callback parameters.");
  const admin=adminClient();
  const {data:stateRow,error}=await admin.from("google_oauth_states").select("*").eq("state",state).single();
  if(error||!stateRow||new Date(stateRow.expires_at)<new Date()) throw new Error("OAuth state expired or invalid.");
  const body=new URLSearchParams({
   code,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,
   redirect_uri:`${app}/api/google/callback`,grant_type:"authorization_code"
  });
  const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const token=await tokenRes.json();
  if(!tokenRes.ok||!token.refresh_token) throw new Error(token.error_description || "Google did not return a refresh token.");
  let googleEmail:string|null=null;
  if(token.access_token){
   const info=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${token.access_token}`}});
   if(info.ok) googleEmail=(await info.json()).email || null;
  }
  await admin.from("google_connections").upsert({
   user_id:stateRow.user_id,google_email:googleEmail,
   encrypted_refresh_token:encryptToken(token.refresh_token),
   scopes:token.scope || ""
  });
  await admin.from("google_oauth_states").delete().eq("state",state);
  return NextResponse.redirect(`${app}/?view=communications&google=connected`);
 }catch(e:any){
  return NextResponse.redirect(`${app}/?view=communications&google_error=${encodeURIComponent(e.message)}`);
 }
}

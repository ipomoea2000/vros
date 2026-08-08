import {NextRequest,NextResponse} from "next/server";
import {encryptMicrosoftToken,msAdminClient} from "@/lib/microsoftServer";
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get("code"),state=req.nextUrl.searchParams.get("state");
 const app=process.env.NEXT_PUBLIC_APP_URL||"/";
 try{
  if(!code||!state)throw new Error("Missing Microsoft OAuth callback parameters.");
  const admin=msAdminClient();
  const {data:s,error}=await admin.from("microsoft_oauth_states").select("*").eq("state",state).single();
  if(error||!s||new Date(s.expires_at)<new Date())throw new Error("Microsoft OAuth state expired or invalid.");
  const tenant=process.env.MICROSOFT_TENANT_ID||"organizations";
  const body=new URLSearchParams({
    client_id:process.env.MICROSOFT_CLIENT_ID!,
    client_secret:process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    redirect_uri:`${app}/api/microsoft/callback`,
    grant_type:"authorization_code",
    scope:"openid profile email offline_access User.Read Mail.ReadWrite"
  });
  const res=await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const token=await res.json();
  if(!res.ok||!token.refresh_token)throw new Error(token.error_description||"Microsoft did not return a refresh token.");
  const me=await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {headers:{Authorization:`Bearer ${token.access_token}`}});
  const profile=me.ok?await me.json():{};
  await admin.from("microsoft_connections").upsert({
    user_id:s.user_id,
    microsoft_email:profile.mail||profile.userPrincipalName||null,
    encrypted_refresh_token:encryptMicrosoftToken(token.refresh_token),
    scopes:token.scope||""
  });
  await admin.from("microsoft_oauth_states").delete().eq("state",state);
  return NextResponse.redirect(`${app}/?view=communications&microsoft=connected`);
 }catch(e:any){
  return NextResponse.redirect(`${app}/?view=communications&microsoft_error=${encodeURIComponent(e.message)}`);
 }
}

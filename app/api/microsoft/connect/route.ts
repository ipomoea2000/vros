import crypto from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {microsoftConfigured,msAdminClient,msCurrentUser} from "@/lib/microsoftServer";
export async function POST(req:NextRequest){
 try{
  if(!microsoftConfigured())return NextResponse.json({error:"Microsoft 365 environment variables are not configured."},{status:503});
  const user=await msCurrentUser(req.headers.get("authorization"));
  const state=crypto.randomBytes(24).toString("base64url");
  await msAdminClient().from("microsoft_oauth_states").insert({state,user_id:user.id,expires_at:new Date(Date.now()+10*60_000).toISOString()});
  const tenant=process.env.MICROSOFT_TENANT_ID||"organizations";
  const params=new URLSearchParams({
    client_id:process.env.MICROSOFT_CLIENT_ID!,
    response_type:"code",
    redirect_uri:`${process.env.NEXT_PUBLIC_APP_URL}/api/microsoft/callback`,
    response_mode:"query",
    scope:"openid profile email offline_access User.Read Mail.ReadWrite",
    state
  });
  return NextResponse.json({url:`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`});
 }catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

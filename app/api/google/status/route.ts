import { NextRequest,NextResponse } from "next/server";
import { adminClient,currentUserFromBearer } from "@/lib/googleServer";

export async function GET(req:NextRequest) {
  try {
    const {user}=await currentUserFromBearer(req.headers.get("authorization"));
    const presence = {
      GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      GOOGLE_TOKEN_ENCRYPTION_KEY: Boolean(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    };
    const missing = Object.entries(presence).filter(([,v])=>!v).map(([k])=>k);
    let data:any=null;
    if (!missing.length) {
      const result=await adminClient().from("google_connections")
        .select("google_email,scopes").eq("user_id",user.id).maybeSingle();
      data=result.data;
    }
    return NextResponse.json({
      configured: missing.length===0,
      connected:Boolean(data),
      google_email:data?.google_email||null,
      scopes:data?.scopes||"",
      diagnostics:{
        missing,
        client_id_format_ok:Boolean(process.env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com")),
        app_url:process.env.NEXT_PUBLIC_APP_URL||"(missing)"
      }
    });
  } catch(e:any){return NextResponse.json({error:e.message},{status:401})}
}

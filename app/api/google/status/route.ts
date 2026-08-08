import { NextRequest,NextResponse } from "next/server";
import { adminClient,currentUserFromBearer } from "@/lib/googleServer";

export async function GET(req:NextRequest) {
  try {
    const {user}=await currentUserFromBearer(req.headers.get("authorization"));

    const checks = {
      GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      GOOGLE_TOKEN_ENCRYPTION_KEY: Boolean(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    };
    const missing = Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    const configured = missing.length === 0;

    let connected = false;
    let google_email:string|null = null;
    let scopes = "";

    if (configured) {
      const {data}=await adminClient().from("google_connections")
        .select("google_email,scopes").eq("user_id",user.id).maybeSingle();
      connected=Boolean(data);
      google_email=data?.google_email||null;
      scopes=data?.scopes||"";
    }

    return NextResponse.json({
      configured,
      connected,
      google_email,
      scopes,
      diagnostics:{
        missing,
        client_id_format_ok: Boolean(process.env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com")),
        app_url: process.env.NEXT_PUBLIC_APP_URL || null
      }
    });
  } catch(e:any){
    return NextResponse.json({error:e.message},{status:401})
  }
}

import { NextRequest,NextResponse } from "next/server";
import { adminClient,currentUserFromBearer,googleConfigured } from "@/lib/googleServer";

export async function GET(req:NextRequest) {
  try {
    const {user}=await currentUserFromBearer(req.headers.get("authorization"));
    if (!googleConfigured()) return NextResponse.json({configured:false,connected:false});
    const {data}=await adminClient().from("google_connections").select("google_email,scopes").eq("user_id",user.id).maybeSingle();
    return NextResponse.json({configured:true,connected:Boolean(data),google_email:data?.google_email||null,scopes:data?.scopes||""});
  } catch(e:any){return NextResponse.json({error:e.message},{status:401})}
}

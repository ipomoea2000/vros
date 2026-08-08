import {NextRequest,NextResponse} from "next/server";
import {microsoftConfigured,msAdminClient,msCurrentUser} from "@/lib/microsoftServer";
export async function GET(req:NextRequest){
 try{
  const user=await msCurrentUser(req.headers.get("authorization"));
  if(!microsoftConfigured())return NextResponse.json({configured:false,connected:false});
  const {data}=await msAdminClient().from("microsoft_connections").select("microsoft_email,scopes").eq("user_id",user.id).maybeSingle();
  return NextResponse.json({configured:true,connected:Boolean(data),microsoft_email:data?.microsoft_email||null,scopes:data?.scopes||""});
 }catch(e:any){return NextResponse.json({error:e.message},{status:401})}
}

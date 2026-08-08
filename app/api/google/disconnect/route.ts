import {NextRequest,NextResponse} from "next/server";
import {adminClient,currentUserFromBearer} from "@/lib/googleServer";
export async function POST(req:NextRequest){
 try{const {user}=await currentUserFromBearer(req.headers.get("authorization"));
 await adminClient().from("google_connections").delete().eq("user_id",user.id);
 return NextResponse.json({ok:true});}catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

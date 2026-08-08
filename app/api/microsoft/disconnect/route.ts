import {NextRequest,NextResponse} from "next/server";
import {msAdminClient,msCurrentUser} from "@/lib/microsoftServer";
export async function POST(req:NextRequest){
 try{const user=await msCurrentUser(req.headers.get("authorization"));
 await msAdminClient().from("microsoft_connections").delete().eq("user_id",user.id);
 return NextResponse.json({ok:true});}catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}

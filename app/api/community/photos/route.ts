import { NextRequest,NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(request:NextRequest){
  const ids=(request.nextUrl.searchParams.get("ids")||"").split(",");
  if(ids.length===0 || ids.length>20 || !ids.every(id=>uuid.test(id))){
    return NextResponse.json({error:"Invalid post IDs"},{status:400,headers});
  }
  const db=serviceClient();
  if(!db){console.error("[community/photos] service client configuration unavailable");return NextResponse.json({error:"Unavailable"},{status:503,headers});}
  const {data:approved,error:statusError}=await db.from("community_tips").select("id")
    .in("id",ids).eq("status","approved");
  if(statusError){console.error("[community/photos] approved post query failed",{code:statusError.code,name:statusError.name,message:String(statusError.message||"").slice(0,180)});return NextResponse.json({error:"Unavailable"},{status:503,headers});}
  const approvedIds=(approved||[]).map(post=>post.id);
  if(!approvedIds.length)return NextResponse.json({photos:{},likeCounts:{}},{headers});
  const {data:images,error:imageError}=await db.from("community_tip_photos")
    .select("post_id,image_position").in("post_id",approvedIds).order("image_position",{ascending:true});
  if(imageError){console.error("[community/photos] image query failed",{code:imageError.code});return NextResponse.json({error:"Unavailable"},{status:503,headers});}
  const photos:Record<string,number[]>={};
  for(const row of images||[]){
    if(!Number.isInteger(row.image_position)||row.image_position<0||row.image_position>3)continue;
    (photos[row.post_id] ||= []).push(row.image_position);
  }
  const {data:likes,error:likesError}=await db.from("community_tip_likes").select("post_id").in("post_id",approvedIds);
  if(likesError){console.error("[community/photos] likes query failed",{code:likesError.code});return NextResponse.json({error:"Unavailable"},{status:503,headers});}
  const counts:Record<string,number>={};
  for(const item of likes||[])counts[item.post_id]=(counts[item.post_id]||0)+1;
  return NextResponse.json({photos,likeCounts:counts},{headers});
}

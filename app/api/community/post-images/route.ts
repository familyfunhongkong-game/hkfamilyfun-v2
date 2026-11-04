import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const id=request.nextUrl.searchParams.get("post_id") || "";
  const headers={"Cache-Control":"public, max-age=30, s-maxage=30","X-Content-Type-Options":"nosniff"};
  if(!uuid.test(id)) return NextResponse.json({error:"Invalid post"}, {status:400,headers});
  const client=serviceClient();
  if(!client) return NextResponse.json({error:"Unavailable"},{status:503,headers});
  const {data:post,error:postError}=await client.from("community_tips")
    .select("id,status").eq("id",id).eq("status","approved").maybeSingle();
  if(postError) return NextResponse.json({error:"Unavailable"},{status:503,headers});
  if(!post) return NextResponse.json({images:[]},{status:404,headers});
  const {data:photos,error:photoError}=await client.from("community_tip_photos")
    .select("image_position,storage_path").eq("post_id",id).order("image_position",{ascending:true}).limit(4);
  if(photoError) return NextResponse.json({error:"Unavailable"},{status:503,headers});
  const images: Array<{position:number;url:string}> = [];
  for(const photo of photos || []) {
    // Sign private Storage URLs only for APPROVED posts. Do not return the
    // unapproved image paths, author IDs or user contact information.
    const {data,error}=await client.storage.from("community-tip-images")
      .createSignedUrl(photo.storage_path,120);
    if(!error && data?.signedUrl) images.push({position:photo.image_position,url:data.signedUrl});
  }
  return NextResponse.json({images},{headers});
}

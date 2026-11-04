import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = {"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("post") || "";
  const position = Number(request.nextUrl.searchParams.get("position"));
  if (!uuid.test(postId) || !Number.isInteger(position) || position < 0 || position > 3) {
    return NextResponse.json({error:"Invalid image"},{status:400,headers});
  }
  const client = serviceClient();
  if (!client) return NextResponse.json({error:"Unavailable"},{status:503,headers});
  // Fail closed: do not sign a private photo URL unless the parent post
  // has explicitly been approved by a human moderator.
  const {data:post,error:postError} = await client.from("community_tips")
    .select("id").eq("id",postId).eq("status","approved").maybeSingle();
  if (postError || !post) return NextResponse.json({error:"Not found"},{status:404,headers});
  const {data:photo,error:photoError} = await client.from("community_tip_photos")
    .select("storage_path").eq("post_id",postId).eq("image_position",position).maybeSingle();
  if (photoError || !photo?.storage_path) return NextResponse.json({error:"Not found"},{status:404,headers});
  // Verify the storage object belongs to the requested approved post.
  const pieces=photo.storage_path.split("/");
  if (pieces.length !== 3 || !uuid.test(pieces[0]) || pieces[1] !== postId ||
      !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(pieces[2])) {
    return NextResponse.json({error:"Invalid image path"},{status:404,headers});
  }
  const {data:signed,error:signError} = await client.storage.from("community-tip-images")
    .createSignedUrl(photo.storage_path,60);
  if (signError || !signed?.signedUrl) return NextResponse.json({error:"Not found"},{status:404,headers});
  return NextResponse.redirect(signed.signedUrl,{status:302,headers});
}

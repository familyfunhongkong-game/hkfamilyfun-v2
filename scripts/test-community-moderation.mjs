import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=p=>readFileSync(p,"utf8");
const tip=get("components/community/CommunityTipsFeed.tsx");
const replies=get("components/community/CommunityReplies.tsx");
const page=get("app/tips/page.tsx");
const dashboard=get("app/admin/page.tsx");
const admin=get("app/admin/community/page.tsx");
const adminReplies=get("app/admin/community/replies/page.tsx");
const photo=get("app/api/community/photo/route.ts");
const photos=get("app/api/community/photos/route.ts");
const schema=get("supabase/migrations/20261104013000_community_likes_photos.sql");
const posts=get("supabase/migrations/20261017000000_community_tips_feed.sql");
const replySchema=get("supabase/migrations/20261017010000_community_tip_replies.sql");
for(const [name,source,tokens] of [
 ["member submission",tip,['auth.getUser()','status:"pending"','"image/jpeg","image/png","image/webp"','photos.length>4','image_position:index','storage_path:path','/api/community/photos?ids=','toggleLike(post.id)','CommunityReplies']],
 ["admin moderation",admin,['.eq("status","pending")','.eq("status","pending").select("id")','createSignedUrl(record.storage_path,120)','postPhotos[row.id]','確認公開呢則社區投稿']],
 ["reply moderation",adminReplies,['community_tip_replies','.eq("status","pending")','reviewed_by:user.id']],
 ["public single image",photo,['.eq("status","approved")','.eq("post_id",postId)','.eq("image_position",position)','createSignedUrl(photo.storage_path,60)','split("/")']],
 ["public photo list",photos,['.eq("status","approved")','approvedIds','"community_tip_photos"','"community_tip_likes"']],
 ["RLS",schema,['enable row level security','Member likes approved posts only','user_id=(select auth.uid())','image_position between 0 and 3','storage_path','public.is_platform_admin()',"'community-tip-images','community-tip-images',false"]],
 ["post moderation",posts,["status = 'approved'","status = 'pending'","is_platform_admin()"]],
 ["reply moderation schema",replySchema,["status='approved'","status='pending'","is_platform_admin()"]],
])for(const token of tokens) assert.ok(source.includes(token),name+" missing contract "+token);
assert.ok(page.includes("<CommunityTipsFeed />"),"Community feed must be visible on tips page");
assert.ok(dashboard.includes('href: "/admin/community"'),"Admin must see moderation queue");
assert.ok(dashboard.includes('href: "/admin/community/replies"'),"Admin must see reply queue");
assert.ok(!photo.includes('eq("status","pending")'),"Pending image must NEVER have public signed URL");
assert.ok(!photos.includes('author_id') && !photos.includes("storage_path"),
  "Public aggregate metadata must not expose photo owners or storage paths");
assert.ok(tip.includes('post_id:created.id'),"Images must link to pending post");
assert.ok(tip.includes('await supabase.storage.from("community-tip-images").remove([path])'),
  "Orphan image must be removed if photo metadata failed");
assert.ok(replies.includes('status:"pending"'),"Replies must be moderated before display");
console.log("[community-moderation] PASS: approved-only media, 4-photo upload, member likes, admin queue, replies and RLS contracts");
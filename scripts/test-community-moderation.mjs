import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(p,"utf8");
const tipSql=read("supabase/migrations/20261017000000_community_tips_feed.sql");
const replySql=read("supabase/migrations/20261017010000_community_tip_replies.sql");
const mediaSql=read("supabase/migrations/20261104020000_community_photos_likes_notifications.sql");
const feed=read("components/community/CommunityTipsFeed.tsx");
const admin=read("app/admin/community/page.tsx");
const photos=read("app/api/community/post-images/route.ts");
const review=read("components/community/AdminCommunityPhotoReview.tsx");
assert.ok(tipSql.includes("status = 'approved'"),"Unapproved tip text must not enter public feed");
assert.ok(tipSql.includes("author_id = (select auth.uid())"),"Every tip must have owner RLS");
assert.ok(replySql.includes("status='approved' and exists"),"Replies need parent approval");
for(const table of ["community_tip_photos","community_tip_likes"]){
 assert.ok(mediaSql.includes("alter table public."+table+" enable row level security"),"RLS missing "+table);
 assert.ok(mediaSql.includes("revoke all on public."+table+" from public,anon,authenticated"),"Overbroad grant "+table);
}
assert.ok(mediaSql.includes("image_position between 0 and 3"),"Posts limited to four images");
assert.ok(mediaSql.includes("'community-tip-images','community-tip-images',false"),"Photo bucket must be private");
assert.ok(mediaSql.includes("file_size_limit=5242880"),"5MB per-photo size cap missing");
assert.ok(mediaSql.includes("Member may attach up to 4 photos to own pending post"),"Photos require owner and pending status");
assert.ok(mediaSql.includes("Member likes approved posts only"),"Only approved posts can be liked");
assert.ok(mediaSql.includes("where p.status='approved'"),"Like totals cannot reveal unpublished tips");
assert.ok(mediaSql.includes("community_tip_submitted") && mediaSql.includes("community_reply_submitted"),"Admin notifications not queued");
assert.ok(mediaSql.includes("notify_admin_new_community_tip") && mediaSql.includes("notify_admin_new_community_reply"),"Trigger notifications on submissions");
for(const expected of ["maxPhotos=4","maxPhotoBytes=5*1024*1024",'storage.from("community-tip-images")',
   'from("community_tip_photos")','from("community_tip_likes")','<CommunityPostPhotos','分享此報料'])
 assert.ok(feed.includes(expected),"Missing member report UI: "+expected);
assert.ok(feed.includes('status:"pending"'),"Submission must remain pending");
assert.ok(admin.includes("reviewConfirmed[row.id]") && admin.includes("photoReady[row.id]"),"Admin cannot approve before review");
assert.ok(review.includes('createSignedUrl(item.storage_path,120)'),"Private Admin review requires signed URLs");
assert.ok(photos.includes('.eq("status","approved")'),"Never expose unapproved images");
assert.ok(photos.includes('createSignedUrl(photo.storage_path,120)'),"Public image URLs must expire");
assert.ok(!photos.includes('service_role'),"Never expose service token");
assert.ok(read("app/tips/page.tsx").includes("<CommunityTipsFeed />"),"Approved community feed must appear on /tips");
assert.ok(read("app/admin/page.tsx").includes('href: "/admin/community"'),"Admin worklist must be accessible");
console.log("[community-moderation] PASS: owner RLS, private 4-image uploads, approved-only likes and previews, review acknowledgement, Admin notification triggers");

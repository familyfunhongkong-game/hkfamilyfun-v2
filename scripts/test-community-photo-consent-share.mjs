import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src=(path)=>readFileSync(path,"utf8");
const feed=src("components/community/CommunityTipsFeed.tsx");
const sql=src("supabase/migrations/20261104040000_community_photo_rights_acknowledgement.sql");
for(const token of [
  'url.searchParams.set("post", post.id)',
  'request=request.eq("id",sharedPostId)',
  '.eq("status","approved")',
  '分享呢則報料',
  '返回全部報料',
  '呢則報料未公開、已被撤回或連結無效',
]) assert.ok(feed.includes(token),"Direct share contract missing "+token);
for(const token of [
  'const [photoRights,setPhotoRights]',
  'photos.length>0 && !photoRights',
  'image_rights_acknowledged_at:',
  'image_rights_version:',
  'required',
  'prepareCommunityPhoto(file)',
  'canvas.toBlob(resolve, "image/jpeg", 0.82)',
  'contentType:"image/jpeg"',
  'bitmap.close()',
]) assert.ok(feed.includes(token),"Photo consent/sanitization contract missing "+token);
for(const token of [
  'community_tips',
  'community_tip_photos',
  'storage.objects',
  'image_rights_acknowledged_at is not null',
  "image_rights_version='2026-11'",
  "(select auth.uid())",
  "p.status='pending'",
]) assert.ok(sql.includes(token),"Photo rights database safeguard missing "+token);
assert.ok(!feed.includes('window.location.origin+"/tips"'),"Sharing must not copy a generic page URL");
assert.ok(!sql.includes("status='approved'"),"Photo upload must be limited to pending posts");
console.log("[community-photo-consent-share] PASS: approved-only deep links, photo self-attestation, RLS and EXIF stripping");

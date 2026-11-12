// STAGING ONLY: isolated real Auth/RLS/Storage/API Community acceptance.
// Uses temporary test users and removes all records and files in finally.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL||"";
const anonKey=process.env.SUPABASE_ANON_KEY||"";
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const preview=process.env.SITE_URL||"";
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET||"";
assert.equal(new URL(url||"https://invalid.example").hostname,"gwoiocllrgdwuxzibcuu.supabase.co","Staging DB only");
assert.ok(anonKey&&serviceKey&&bypass,"Staging keys + protected preview bypass required");
assert.ok(preview.startsWith("https://hkfamilyfun-staging-"),"Isolated Staging preview URL required");
const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const member=()=>createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const suffix=Date.now()+"-"+Math.random().toString(36).slice(2,8);
const users=[],createdPosts=[],uploadedPaths=[],checks=[];
let adminRowId="";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+hBB0AAAAASUVORK5CYII=","base64");
async function ok(query,label) {
  const {data,error}=await query;
  if(error)throw new Error(label+": "+error.message);
  return data;
}
async function previewGet(path) {
  return fetch(new URL(path,preview),{redirect:"manual",headers:{"x-vercel-protection-bypass":bypass},signal:AbortSignal.timeout(25000)});
}
async function cleanup() {
  const errors=[];
  async function step(label,promise) {
    try {const {error}=await promise;if(error)throw error;}
    catch(e){errors.push(label+": "+String(e?.message||e));}
  }
  // Remove server-owned references before user deletion so identities cannot linger.
  for(const id of createdPosts) {
    await step("likes",service.from("community_tip_likes").delete().eq("post_id",id));
    await step("replies",service.from("community_tip_replies").delete().eq("post_id",id));
    await step("photo metadata",service.from("community_tip_photos").delete().eq("post_id",id));
    await step("post",service.from("community_tips").delete().eq("id",id));
  }
  if(uploadedPaths.length)await step("photos",service.storage.from("community-tip-images").remove(uploadedPaths));
  if(adminRowId)await step("temporary admin",service.from("admin_users").delete().eq("id",adminRowId));
  for(const id of users)await step("temporary auth user",service.auth.admin.deleteUser(id));
  const remaining=await ok(service.from("community_tips").select("id").in("id",createdPosts),"check cleanup");
  assert.equal(remaining.length,0,"Community test left post rows");
  if(errors.length)throw new Error("CLEANUP FAILED: "+errors.join("; "));
}
try {
  const health=await previewGet("/api/health");
  assert.equal(health.status,200,"Staging health HTTP");
  const body=await health.json();
  assert.ok(body.ok,"Staging health");
  assert.equal(body.buildSha,process.env.GITHUB_SHA,"CI SHA must match deployed Staging");
  checks.push("same_sha_isolated_staging");
  async function make(role) {
    const email="hkff-community-"+role+"-"+suffix+"@example.com";
    const password="Qa!"+role+"-"+suffix+"X8";
    const info=await ok(service.auth.admin.createUser({email,password,email_confirm:true}),"create "+role);
    const id=info.user?.id;
    assert.ok(id);
    users.push(id);
    const client=member();
    const signed=await ok(client.auth.signInWithPassword({email,password}),"signIn "+role);
    assert.ok(signed.session?.access_token);
    return {id,email,client};
  }
  const a=await make("a"),b=await make("b"),mod=await make("mod");
  checks.push("three_real_password_sessions");

  const row=await ok(service.from("admin_users").insert({user_id:mod.id,email:mod.email,role:"admin",status:"active"}).select("id").single(),"temporary admin role");
  adminRowId=row.id;
  const adminProbe=await ok(mod.client.rpc("is_platform_admin"),"admin permission");
  const memberProbe=await ok(a.client.rpc("is_platform_admin"),"member permission");
  assert.equal(adminProbe,true);assert.equal(memberProbe,false);
  checks.push("admin_role_not_derived_from_user_metadata");

  const post=await ok(a.client.from("community_tips").insert({
    author_id:a.id,display_name:"HKFF QA Member",title:"[QA] Community E2E "+suffix,
    body:"Staging-only verified member submission. Removed after test.",
    district:"沙田",category:"免費活動",status:"pending",
    image_rights_acknowledged_at:new Date().toISOString(),image_rights_version:"2026-11"
  }).select("id").single(),"member creates pending post");
  createdPosts.push(post.id);
  checks.push("member_can_create_pending_post_with_photo_rights");

  const publiclyPending=await ok(member().from("community_tips").select("id").eq("id",post.id),"anon pending post");
  assert.equal(publiclyPending.length,0);
  const byB=await ok(b.client.from("community_tips").select("id").eq("id",post.id),"other member pending post");
  assert.equal(byB.length,0);
  const byA=await ok(a.client.from("community_tips").select("id").eq("id",post.id),"owner pending post");
  assert.equal(byA.length,1);
  checks.push("pending_post_owner_only_not_anon_or_other_member");

  const bypassApproval=await b.client.from("community_tips").insert({
    author_id:b.id,display_name:"QA Forbidden",title:"QA FORGED",
    body:"Forbidden approval",district:"沙田",category:"其他",status:"approved"
  });
  assert.ok(bypassApproval.error,"Member may not create approved post");
  const forbiddenUpdate=await b.client.from("community_tips").update({status:"approved"}).eq("id",post.id);
  assert.ok(forbiddenUpdate.error || (forbiddenUpdate.data||[]).length===0,"Member must not approve another member's post");
  const unchanged=await ok(service.from("community_tips").select("status").eq("id",post.id).single(),"check member mutation was denied");
  assert.equal(unchanged.status,"pending","Member unexpectedly changed pending post status");
  checks.push("members_cannot_self_publish_or_approve_others");

  const path=a.id+"/"+post.id+"/qa-e2e-"+suffix+".png";
  await ok(a.client.storage.from("community-tip-images").upload(path,png,{contentType:"image/png",upsert:false}),"upload owner photo");
  uploadedPaths.push(path);
  await ok(a.client.from("community_tip_photos").insert({post_id:post.id,author_id:a.id,image_position:0,storage_path:path}),"photo metadata");
  checks.push("owner_private_photo_upload_and_metadata");

  const foreignPhoto=await b.client.from("community_tip_photos").insert({post_id:post.id,author_id:b.id,image_position:1,storage_path:b.id+"/"+post.id+"/forbidden.png"});
  assert.ok(foreignPhoto.error,"Other member must not attach photo");
  const otherPhotos=await ok(b.client.from("community_tip_photos").select("post_id").eq("post_id",post.id),"other member reads photos");
  assert.equal(otherPhotos.length,0);
  const unapprovedPhoto=await previewGet("/api/community/photo?post="+post.id+"&position=0");
  assert.equal(unapprovedPhoto.status,404,"Pending photo cannot be publicly signed");
  checks.push("unapproved_photo_hidden_from_public_and_others");

  const allPending=await ok(mod.client.from("community_tips").select("id,status").eq("id",post.id),"admin reads pending");
  assert.equal(allPending.length,1);
  await ok(mod.client.from("community_tips").update({status:"approved",reviewed_at:new Date().toISOString(),reviewed_by:mod.id}).eq("id",post.id),"Admin approves");
  const publicPost=await ok(member().from("community_tips").select("id,status").eq("id",post.id).single(),"approved public post");
  assert.equal(publicPost.status,"approved");
  checks.push("admin_approves_and_public_can_read_approved_post");

  const photo=await previewGet("/api/community/photo?post="+post.id+"&position=0");
  assert.equal(photo.status,302,"Approved image API redirects to short-lived signed URL");
  const signedLocation=photo.headers.get("location")||"";
  assert.ok(signedLocation.includes("community-tip-images") && signedLocation.includes("token="),"Photo redirect must be signed");
  checks.push("approved_photo_signed_url_only");

  await ok(b.client.from("community_tip_likes").insert({post_id:post.id,user_id:b.id}),"Member likes approved post");
  const duplicate=await b.client.from("community_tip_likes").insert({post_id:post.id,user_id:b.id});
  assert.ok(duplicate.error,"Duplicate like must be prevented");
  const forgedLike=await a.client.from("community_tip_likes").insert({post_id:post.id,user_id:b.id});
  assert.ok(forgedLike.error,"Member cannot like on behalf of another user");
  const agg=await previewGet("/api/community/photos?ids="+post.id);
  assert.equal(agg.status,200);
  const photoSummary=await agg.json();
  assert.deepEqual(photoSummary.photos?.[post.id],[0]);
  assert.equal(photoSummary.likeCounts?.[post.id],1);
  checks.push("approved_like_aggregate_and_private_identity");

  const reply=await ok(b.client.from("community_tip_replies").insert({
    post_id:post.id,author_id:b.id,display_name:"HKFF QA Reply",body:"Staging only pending reply",status:"pending"
  }).select("id").single(),"member reply");
  const before=await ok(member().from("community_tip_replies").select("id").eq("id",reply.id),"anon pending reply");
  assert.equal(before.length,0);
  await ok(mod.client.from("community_tip_replies").update({status:"approved",reviewed_at:new Date().toISOString(),reviewed_by:mod.id}).eq("id",reply.id),"admin approves reply");
  const after=await ok(member().from("community_tip_replies").select("id,status").eq("id",reply.id).single(),"anon approved reply");
  assert.equal(after.status,"approved");
  checks.push("reply_pending_hidden_then_admin_approved_public");

  const denial=await b.client.from("community_tip_replies").update({status:"rejected"}).eq("id",reply.id);
  assert.ok(denial.error || (denial.data||[]).length===0,"Member cannot moderate replies");
  await ok(b.client.from("community_tip_likes").delete().eq("post_id",post.id).eq("user_id",b.id),"remove own like");
  const aggAfter=await previewGet("/api/community/photos?ids="+post.id);
  const countAfter=await aggAfter.json();
  assert.ok(!countAfter.likeCounts?.[post.id],"Removed like no longer appears");
  const replyUnchanged=await ok(service.from("community_tip_replies").select("status").eq("id",reply.id).single(),"check member reply mutation");
  assert.equal(replyUnchanged.status,"approved","Member changed reply moderation state");
  checks.push("member_cannot_moderate_and_can_unlike");

  console.log(JSON.stringify({success:true,environment:"staging",checks},null,2));
} finally {
  await cleanup();
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const get=p=>readFileSync(p,"utf8");
const trigger=get("supabase/migrations/20261104030000_community_admin_notifications.sql");
const digest=get("scripts/send-daily-pending-notice.mjs");
const admin=get("app/admin/notifications/page.tsx");
for(const signal of ["community_tip_submitted","community_reply_submitted","notify_admin_new_community_tip","notify_admin_new_community_reply","security definer","set search_path = ''","dedupe_key","on conflict do nothing"]) {
 assert.ok(trigger.toLowerCase().includes(signal.toLowerCase()),"Community notification migration missing "+signal);
}
for(const signal of ["get(\"community_tips\"","get(\"community_tip_replies\"","pendingCommunityPosts.map","pendingCommunityReplies.map","/admin/community/replies","/admin/community","communityPosts:pendingCommunityPosts.length"]) {
 assert.ok(digest.includes(signal),"Admin email digest missing "+signal);
}
assert.ok(admin.includes('if (kind === "community_tip_submitted")'),"Admin should show community tip notification label");
assert.ok(admin.includes('if (kind === "community_reply_submitted")'),"Admin should show community reply notification label");
assert.ok(trigger.includes("new.author_id"),"Trigger must attribute authentic actor");
assert.ok(!trigger.includes("email_to,"),"In-app notification must not pretend that email has been delivered");
console.log("[community-admin-notifications] PASS: triggers, deduplication, admin inbox and daily digest integration");

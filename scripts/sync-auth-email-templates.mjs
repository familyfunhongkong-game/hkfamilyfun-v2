// Hosted Supabase Auth email template updater: fail-closed, manual operation only.
// Uses Supabase Management API. Never run in a browser or expose the access token.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const refs = {
  staging: "gwoiocllrgdwuxzibcuu",
  production: "uiyrbqqvgnfhfdhedmav",
};
const target = process.env.HKFF_AUTH_TARGET || process.argv[2];
const apply = process.argv.includes("--apply") || process.env.HKFF_AUTH_EMAIL_APPLY === "true";
assert.ok(Object.hasOwn(refs, target), "Pass staging or production only");
const token = process.env.SUPABASE_ACCESS_TOKEN;
assert.ok(token && token.length >= 15, "Management API token required in a secret; never commit it");
if (target === "production" && apply) {
  assert.equal(process.env.HKFF_AUTH_EMAIL_PRODUCTION_APPROVED, "YES",
    "Production Auth template update needs explicit release-owner approval");
}

const logoUrl = "https://www.hkfamilyfun.com/api/brand/family-fun-logo";
const expectedLogo = "bf9f56f08f6a2cf522db388037e83c2d3363ebc5858400378efd6ead4ade9fa5";
const endpoint = "https://api.supabase.com/v1/projects/" + refs[target] + "/config/auth";
const proposed = {
  mailer_subjects_confirmation: "HK Family Fun｜確認你的電郵地址",
  mailer_templates_confirmation_content: readFileSync("supabase/templates/confirmation.html","utf8"),
  mailer_subjects_recovery: "HK Family Fun｜重設你的帳戶密碼",
  mailer_templates_recovery_content: readFileSync("supabase/templates/recovery.html","utf8")
};
for (const key of ["mailer_templates_confirmation_content","mailer_templates_recovery_content"]) {
  assert.ok(proposed[key].includes('href="{{ .ConfirmationURL }}"'),key+": missing tokenized action");
  assert.ok(proposed[key].includes(logoUrl),key+": missing original brand logo");
}
const sha = (value) => createHash("sha256").update(value || "").digest("hex").slice(0,16);

async function checkLogo() {
  const response = await fetch(logoUrl,{signal:AbortSignal.timeout(20000),redirect:"follow"});
  assert.equal(response.status,200,"Canonical logo URL unavailable to email clients");
  assert.match(response.headers.get("content-type") || "",/image\/png/i,"Logo endpoint must return PNG, not an HTML maintenance page");
  const data=Buffer.from(await response.arrayBuffer());
  assert.equal(data.length,20047,"Canonical logo byte size mismatch");
  assert.equal(createHash("sha256").update(data).digest("hex"),expectedLogo,"Canonical logo differs from founder's uploaded artwork");
}
async function management(method,payload) {
  const response=await fetch(endpoint,{
    method,
    headers:{
      "Authorization":"Bearer "+token,
      "Content-Type":"application/json",
      "Accept":"application/json"
    },
    body:payload?JSON.stringify(payload):undefined,
    signal:AbortSignal.timeout(30000)
  });
  if(!response.ok) throw new Error("Supabase Auth config "+method+" failed: HTTP "+response.status);
  return response.json();
}
await checkLogo();
const current=await management("GET");
const currentSelected=Object.fromEntries(Object.keys(proposed).map(k=>[k,current[k]??""]));
const changedKeys=Object.keys(proposed).filter(k=>currentSelected[k]!==proposed[k]);
const results=Object.fromEntries(Object.keys(proposed).map(k=>[k,{matches:currentSelected[k]===proposed[k],current_sha:sha(currentSelected[k]),proposed_sha:sha(proposed[k])}]));
console.log(JSON.stringify({target,mode:apply?"apply":"verify",changedKeys,results,logo:"original SHA256 verified"}));
if (!apply) {
  if (changedKeys.length) {
    console.error("Not yet applied. Use explicit --apply in an approved environment after verifying configuration.");
    process.exitCode=2;
  } else console.log("[auth-email-templates] PASS: both hosted templates are correctly branded");
} else if (changedKeys.length) {
  const dir="artifacts/auth-email-backups";
  mkdirSync(dir,{recursive:true});
  const backup=dir+"/"+target+"-"+new Date().toISOString().replaceAll(":","-")+".json";
  writeFileSync(backup,JSON.stringify(currentSelected,null,2),{mode:0o600,flag:"wx"});
  console.log("Selected former template fields backed up locally at "+backup+" (not uploaded / not committed)");
  await management("PATCH",proposed);
  const readback=await management("GET");
  for(const key of Object.keys(proposed))assert.equal(readback[key],proposed[key],"Hosted template readback mismatch: "+key);
  console.log("[auth-email-templates] PASS: hosted Supabase Auth template settings updated and read back for "+target);
} else {
  console.log("[auth-email-templates] PASS: hosted templates already match; no patch required");
}

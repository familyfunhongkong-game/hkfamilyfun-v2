// Staging-only parent Auth and two-account RLS browser QA. Temporary identities are deleted in finally.
"use strict";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const preview = process.env.SITE_URL || "";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
assert.equal(new URL(url || "https://invalid.example").hostname,"gwoiocllrgdwuxzibcuu.supabase.co","Staging DB ONLY");
assert.ok(/^https:\/\/hkfamilyfun-staging-[a-z0-9-]+\.vercel\.app$/.test(preview),"Protected Staging Preview ONLY");
assert.ok(anonKey && serviceKey && bypass,"Staging credentials and Vercel bypass required");
assert.ok(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||""),"Exact E2E candidate SHA required");

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const anonymous=()=>createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const suffix=Date.now()+"-"+Math.random().toString(36).slice(2,8);
const emailA="hkff-parent-a-"+suffix+"@example.com";
const emailB="hkff-parent-b-"+suffix+"@example.com";
const pw7="A7!bC2d"; // Exactly seven
const pw8="A7!bC2dE"; // Exactly eight
const pwB="Hkff-Parent-B-"+suffix+"!9";
const createdUsers=[];
const checks=[];
let browser;
function ok(result,label){if(result.error)throw new Error(label+": "+result.error.message);return result.data;}

async function cleanup(){
 const issues=[];
 if(createdUsers.length){
   const ids=createdUsers.map(x=>x.id);
   for(const table of ["user_saved_events","user_event_preferences"]){
     const r=await service.from(table).delete().in("user_id",ids);
     if(r.error)issues.push(table+": "+r.error.message);
   }
   for(const user of createdUsers.reverse()){
     const r=await service.auth.admin.deleteUser(user.id);
     if(r.error)issues.push("auth user "+user.id+": "+r.error.message);
   }
 }
 if(issues.length)throw new Error("Staging parent E2E cleanup failed: "+issues.join("; "));
}

try {
  const h=await fetch(preview+"/api/health",{headers:{"x-vercel-protection-bypass":bypass},signal:AbortSignal.timeout(25000)});
  assert.equal(h.status,200,"Protected Staging health");
  const health=await h.json();
  assert.equal(health.buildSha,process.env.GITHUB_SHA,"Exact GitHub SHA must equal Staging build SHA");
  checks.push("same_SHA_preview");

  // Staging SMTP currently refuses external example.com signup addresses (HTTP 500).
  // Admin-created temporary users let us test actual password login and strict RLS
  // without sending email. This does NOT prove server-side signup minimum or mail delivery.
  const aData=ok(await service.auth.admin.createUser({email:emailA,password:pw8,email_confirm:true}),"Create private eight-character Staging user");
  assert.ok(aData.user?.id,"Test user must be created");
  const aId=aData.user.id;
  createdUsers.push({id:aId});
  checks.push("eight_character_password_auth_admin_user_only");
  console.warn("[staging-parent] MAIL / SIGNUP GATE OPEN: actual public signup and server-side minimum require a permitted test inbox and explicit separate test");
  const bData=ok(await service.auth.admin.createUser({email:emailB,password:pwB,email_confirm:true}),"Create second temporary user");
  const bId=bData.user?.id;
  assert.ok(bId);
  createdUsers.push({id:bId});
  const login=async (email,password)=> {
    const client=anonymous();
    const data=ok(await client.auth.signInWithPassword({email,password}),"Real Auth login "+email);
    assert.ok(data.session?.access_token);
    return client;
  };
  const a=await login(emailA,pw8),b=await login(emailB,pwB);
  checks.push("two_real_password_sessions");

  const events=ok(await service.from("events").select("id,title_tc").eq("status","published").not("cover_image_url","is",null).order("start_date",{ascending:true}).limit(2),"Select actual published events");
  assert.ok(events.length===2,"Two distinct published Staging events required");
  const eventId=events[0].id;
  ok(await a.from("user_saved_events").insert({user_id:aId,event_id:eventId}),"A saves event");
  let own=ok(await a.from("user_saved_events").select("event_id").eq("user_id",aId),"A own save");
  assert.equal(own.length,1);
  let hidden=ok(await b.from("user_saved_events").select("event_id").eq("user_id",aId),"B cannot see A saved event");
  assert.equal(hidden.length,0);
  const forged=await b.from("user_saved_events").insert({user_id:aId,event_id:events[1].id});
  assert.ok(forged.error,"B must not insert A private saved event");
  const afterForgery=ok(await service.from("user_saved_events").select("event_id").eq("user_id",aId),"Check forged bookmark never inserted");
  assert.ok(!afterForgery.some(x=>x.event_id===events[1].id),"RLS bypass allowed B to forge a new A bookmark");
  checks.push("saved_events_cross_account_RLS");

  ok(await a.from("user_event_preferences").upsert({user_id:aId,favorite_district:"中西區",free_only:true,preferred_category:"文化藝術"}),"A saves preferences");
  let prefA=ok(await a.from("user_event_preferences").select("favorite_district,free_only").eq("user_id",aId).single(),"A reads preferences");
  assert.equal(prefA.favorite_district,"中西區");
  let hiddenPrefs=ok(await b.from("user_event_preferences").select("user_id").eq("user_id",aId),"B cannot read A preferences");
  assert.equal(hiddenPrefs.length,0);
  const prefAttack=await b.from("user_event_preferences").upsert({user_id:aId,favorite_district:"油尖旺區",free_only:false});
  assert.ok(prefAttack.error,"B must not overwrite A private preferences");
  prefA=ok(await a.from("user_event_preferences").select("favorite_district").eq("user_id",aId).single(),"A preferences after attack");
  assert.equal(prefA.favorite_district,"中西區");
  checks.push("preferences_cross_account_RLS");

  const aNewDevice=await login(emailA,pw8);
  const cloud=ok(await aNewDevice.from("user_saved_events").select("event_id").eq("user_id",aId),"Second device cloud saved events");
  assert.ok(cloud.some(x=>x.event_id===eventId),"Saved event must be available across sessions");
  checks.push("cross_device_saved_event");

  browser=await chromium.launch({headless:true});
  const ctxA=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2,extraHTTPHeaders:{"x-vercel-protection-bypass":bypass}});
  const ctxB=await browser.newContext({viewport:{width:375,height:812},isMobile:true,deviceScaleFactor:2,extraHTTPHeaders:{"x-vercel-protection-bypass":bypass}});
  const signIn=async (ctx,email,password)=>{
    const page=await ctx.newPage();
    await page.goto(preview+"/login",{waitUntil:"domcontentloaded",timeout:35000});
    // A new mobile user's consent panel covers the submit button until chosen.
    const consentAlreadyStored=await page.evaluate(()=>document.cookie.split(";").some(x=>x.trim().startsWith("hkff_cookie_preferences=")));
    if(!consentAlreadyStored){
      const reject=page.getByRole("button",{name:"全部拒絕"});
      await reject.waitFor({state:"visible",timeout:12000});
      await reject.click();
      await page.getByTestId("cookie-confirm-close").click();
      await page.getByRole("region",{name:"你的 Cookies 選擇"}).waitFor({state:"hidden",timeout:12000});
    }
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').waitFor({state:"visible",timeout:20000});
    await page.locator('button[type="submit"]').click({timeout:20000});
    await page.getByText("已登入："+email).waitFor({state:"visible",timeout:25000});
    return page;
  };
  const signupPage=await ctxA.newPage();
  await signupPage.goto(preview+"/login",{waitUntil:"domcontentloaded",timeout:35000});
  const consent=signupPage.getByRole("button",{name:"全部拒絕"});
  if(await consent.isVisible()){
    await consent.click();
    await signupPage.getByTestId("cookie-confirm-close").click();
  }
  await signupPage.getByRole("tab",{name:"免費註冊"}).click();
  const input=signupPage.locator('input[type="password"]');
  await input.fill(pw7);
  assert.equal(await input.evaluate(el=>el.validity.tooShort),true,"Seven-character registration should fail real browser validation");
  await input.fill(pw8);
  assert.equal(await input.evaluate(el=>el.validity.tooShort),false,"Eight-character registration must pass real browser minLength");
  checks.push("real_browser_7_rejected_8_valid_client_side");
  await signupPage.close();
  const pageA=await signIn(ctxA,emailA,pw8);
  const pageB=await signIn(ctxB,emailB,pwB);
  checks.push("real_390_375_browser_login");
  await pageA.goto(preview+"/favorites",{waitUntil:"domcontentloaded",timeout:35000});
  await pageA.getByText(events[0].title_tc,{exact:false}).first().waitFor({state:"visible",timeout:25000});
  checks.push("browser_favorites_cross_device");
  await mkdir("artifacts/hkff-parent",{recursive:true});
  await pageA.screenshot({path:"artifacts/hkff-parent/parent-a-390-saved-events.png",fullPage:true});
  await pageB.screenshot({path:"artifacts/hkff-parent/parent-b-375-logged-in.png",fullPage:true});
  console.log("[staging-parent] PASS",JSON.stringify({checks,eventId,sha:process.env.GITHUB_SHA}));
} finally {
  if(browser)await browser.close();
  await cleanup();
}

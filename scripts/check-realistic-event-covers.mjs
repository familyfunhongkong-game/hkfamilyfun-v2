import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const themes=["nature","science","arts","culture","festive","performance"];
const root="public/images/realistic-event-covers";
const component=readFileSync("components/resilient-event-image.tsx","utf8");
const card=readFileSync("components/events/PublicEventCard.tsx","utf8");
const search=readFileSync("components/events/PublicEventsSearchClient.tsx","utf8");

assert.ok(component.includes('NEXT_PUBLIC_HKFF_REALISTIC_COVERS !== "false"'),"Photos enabled with explicit rollback switch");
assert.ok(component.includes("shouldUsePhotoFallback(originalSrc)"),"Never replace real organiser photographs");
assert.ok(component.includes("AI 示意圖 · 非活動實景"),"Generated images must carry disclosure");
assert.ok(component.includes("!failedSources.includes(candidate)") && component.includes("setFailedSources((previous)"),"Failed image candidates must never alternate in a retry loop");
assert.equal(card.split("category={event.category}").length-1,2,"Both public card variants need category");
assert.ok(search.includes("category={category}"),"Search cards must use theme");
assert.ok(search.includes("isSafeImageSrc"),"Local /images/ paths must be visible in gallery");

const existing=themes.filter(t=>existsSync(join(root,"hkff-"+t+"-photorealistic.webp")));
assert.equal(existing.length,6,"All six first-party WebP assets must be present in every release build");
for(const theme of existing){
 const bytes=readFileSync(join(root,"hkff-"+theme+"-photorealistic.webp"));
 assert.ok(bytes.length>=3000 && bytes.length<=400000,"Unexpected asset size "+theme);
 assert.equal(bytes.subarray(0,4).toString("ascii"),"RIFF","Invalid WebP container "+theme);
 assert.equal(bytes.subarray(8,12).toString("ascii"),"WEBP","Invalid WebP format "+theme);
}
console.log("[realistic-event-covers] PASS: six-theme source, safe photo fallback, first-party image paths and AI disclosure; present assets="+existing.length+"/6; enabled="+(process.env.NEXT_PUBLIC_HKFF_REALISTIC_COVERS!=="false"));

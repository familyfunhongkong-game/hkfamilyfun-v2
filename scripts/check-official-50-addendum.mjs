import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const scope=["2026-11-16","2027-04-01"];
const manifest=JSON.parse(readFileSync("data/official-family-events-addendum-20261115-50.json","utf8"));
assert.deepEqual(manifest.date_scope,scope,"50-event date scope changed");
assert.equal(manifest.records.length,50,"Expected exactly 50 additional HK Family Fun events");
const batches=["a","b","c"].flatMap(c=>JSON.parse(readFileSync("data/official-events-addendum-20261115-batch-"+c+".json","utf8")).records);
assert.equal(batches.length,50,"19+19+12 source batches must equal manifest length");
const byKey=new Map(batches.map(r=>[r.key,r]));
assert.equal(byKey.size,50,"Duplicate batch keys");
const existing=["data/verified-family-events-20261116-20270401.json","data/verified-hkpl-addendum-202612-202704.json"]
 .flatMap(path=>JSON.parse(readFileSync(path,"utf8")).records);
const triples=new Set(existing.map(r=>[r.title_tc,r.start_date,r.venue_name].join("|").toLowerCase()));
const ids=new Set();
const permittedHosts=new Set(["hk.science.museum","hkac.org.hk","hk.space.museum","hk.art.museum","www.hkpm.org.hk","www.hk.artsfestival.org","www.taikwun.hk","www.hkballet.com","www.hkpl.gov.hk"]);
function validDay(x){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x||"")))return false;
 const d=new Date(x+"T00:00:00Z");
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===x;
}
assert.ok(existsSync("public/images/verified-event-placeholder.svg"),"First-party image fallback missing");
for(const r of manifest.records){
 const b=byKey.get(r.key);
 assert.ok(b,"Missing item in checked source batches "+r.key);
 for(const k of ["title_tc","start_date","end_date","venue_name","district","source_url","price_type","price_label"]){
   assert.equal(r[k],b[k],"Batch/manifest mismatch in "+r.key+" for "+k);
 }
 assert.ok(!ids.has(r.source_fingerprint),"Duplicate source fingerprint "+r.key);
 ids.add(r.source_fingerprint);
 assert.equal(r.source_fingerprint,"hkff:curated:20261115:add50:"+r.key,"Fingerprint mismatch "+r.key);
 assert.ok(r.title_tc.trim().length>=5&&r.venue_name&&r.district&&r.organizer_name,"Missing core facts "+r.key);
 assert.ok(validDay(r.start_date)&&validDay(r.end_date)&&r.start_date<=r.end_date,"Invalid dates "+r.key);
 assert.ok(r.start_date<=scope[1]&&r.end_date>=scope[0],"Outside target window "+r.key);
 const source=new URL(r.source_url);
 assert.equal(source.protocol,"https:","Source must be HTTPS "+r.key);
 assert.ok(permittedHosts.has(source.hostname),"Source must be one of the official organisations "+r.key);
 assert.equal(r.official_url,r.source_url,"Primary event source must survive normalization");
 assert.ok(["free","paid","mixed","unknown"].includes(r.price_type),"Invalid price class "+r.key);
 assert.ok(r.price_label.trim().length>=2,"Price conditions missing "+r.key);
 assert.equal(r.is_free,r.price_type==="free","Incorrect free label "+r.key);
 assert.ok(!(r.price_type==="free"&&/HK\$\s*[1-9]/i.test(r.price_label)),"Free/paid mismatch "+r.key);
 const theme=["科學探索","天文科學","互動體驗"].includes(r.category)?"science":r.category==="親子活動"?"festive":"arts";
 const cover="/images/ai-event-covers/hkff-"+theme+".svg";
 assert.equal(r.cover_image_url,cover,"Every newly curated event must use its first-party AI thematic cover");
 assert.ok(existsSync("public"+cover),"AI category asset must exist for "+r.key);
 const art=readFileSync("public"+cover,"utf8");
 assert.ok(art.includes("AI 示意圖 · 非活動實景"),"AI cover must permanently disclose illustration origin");
 assert.ok(!/<script|foreignObject|<image/i.test(art),"No external image loads or executable contents allowed in AI cover");
 assert.ok(r.image_provenance.includes("AI-generated"),"AI image provenance metadata required");

 assert.ok(r.recurrence_type==="none"||r.recurrence_type==="weekly","Invalid recurrence "+r.key);
 if(r.recurrence_type==="weekly")assert.ok(Array.isArray(r.recurrence_weekdays)&&r.recurrence_weekdays.length>0,"Missing regular weekdays");
 const triple=[r.title_tc,r.start_date,r.venue_name].join("|").toLowerCase();
 assert.ok(!triples.has(triple),"Duplicate event or exact session "+r.key);
 triples.add(triple);
}
const replacement=manifest.records.find(r=>r.key==="hkpl-tst-story-dec19");
assert.ok(replacement&&replacement.source_url.endsWith("/307234/storytelling-for-children-cantonese")&&replacement.start_date==="2026-12-19");
assert.ok(!manifest.records.some(r=>r.key==="hkpl-poonroad-wonders-space"),"Unverifiable display must stay removed");
// Verified official HKPM special hours: closed Mon 2026-11-30, open Tue 2026-12-01.
const palace=manifest.records.filter(r=>r.key.startsWith("palace-"));
assert.equal(palace.length,4,"Expected 4 curated HK Palace Museum exhibitions");
for(const r of palace){
 assert.deepEqual(r.recurrence_exclude_dates,["2026-11-30"],"HKPM special closure required "+r.key);
 assert.deepEqual(r.recurrence_include_dates,["2026-12-01"],"HKPM special Tuesday opening required "+r.key);
 assert.deepEqual(byKey.get(r.key).recurrence_exclude_dates,r.recurrence_exclude_dates,"HKPM raw and consolidated closure drift");
 assert.deepEqual(byKey.get(r.key).recurrence_include_dates,r.recurrence_include_dates,"HKPM raw and consolidated special opening drift");
}
const nutcracker=manifest.records.find(r=>r.key==="ballet-nutcracker");
assert.ok(nutcracker,"Missing 2026 HK Ballet Nutcracker");
assert.deepEqual(nutcracker.recurrence_exclude_dates,["2026-12-14","2026-12-21","2026-12-22","2026-12-23"],"Never claim a Nutcracker show on absent official performance dates");
assert.deepEqual(byKey.get(nutcracker.key).recurrence_exclude_dates,nutcracker.recurrence_exclude_dates,"Nutcracker source batch must match curated manifestation");
console.log("[official-50-addendum] PASS: 50 source-matched, valid, deduplicated sessions; licensed first-party AI disclosure covers; exact 2026-11-16 to 2027-04-01 window");

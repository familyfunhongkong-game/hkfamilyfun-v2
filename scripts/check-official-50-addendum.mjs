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
 assert.equal(r.cover_image_url,"/images/verified-event-placeholder.svg","Organizer images may not be used without rights review");
 assert.ok(r.image_provenance.includes("non-AI"),"Do not claim fallback is AI-generated artwork");
 assert.ok(r.recurrence_type==="none"||r.recurrence_type==="weekly","Invalid recurrence "+r.key);
 if(r.recurrence_type==="weekly")assert.ok(Array.isArray(r.recurrence_weekdays)&&r.recurrence_weekdays.length>0,"Missing regular weekdays");
 const triple=[r.title_tc,r.start_date,r.venue_name].join("|").toLowerCase();
 assert.ok(!triples.has(triple),"Duplicate event or exact session "+r.key);
 triples.add(triple);
}
const replacement=manifest.records.find(r=>r.key==="hkpl-tst-story-dec19");
assert.ok(replacement&&replacement.source_url.endsWith("/307234/storytelling-for-children-cantonese")&&replacement.start_date==="2026-12-19");
assert.ok(!manifest.records.some(r=>r.key==="hkpl-poonroad-wonders-space"),"Unverifiable display must stay removed");
console.log("[official-50-addendum] PASS: 50 source-matched, valid, deduplicated sessions; original image fallback; exact 2026-11-16 to 2027-04-01 window");

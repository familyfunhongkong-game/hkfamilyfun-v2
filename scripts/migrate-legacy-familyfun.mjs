"use strict";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL || "https://nyutyriuypjznbxtlbmo.supabase.co";
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || "";
const NEW_URL = process.env.SUPABASE_URL || "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APPLY = String(process.env.APPLY_MIGRATION || "false").toLowerCase() === "true";
const BATCH_SIZE = 200;

if (!OLD_KEY) throw new Error("OLD_SUPABASE_SERVICE_ROLE_KEY is required");
if (!NEW_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession:false, autoRefreshToken:false } });

function text(v){ return v == null ? "" : String(v).trim(); }
function arr(v){
  if (Array.isArray(v)) return v.map(String).map(s=>s.trim()).filter(Boolean);
  if (!v) return [];
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.map(String).map(s=>s.trim()).filter(Boolean);
    } catch {}
    return v.split(/[,，、\n]/).map(s=>s.trim()).filter(Boolean);
  }
  return [];
}
function hkParts(ts){
  if (!ts) return {date:null,time:null};
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return {date:null,time:null};
  const parts = new Intl.DateTimeFormat("en-CA",{
    timeZone:"Asia/Hong_Kong",year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hour12:false
  }).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value || "";
  return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}`};
}
function norm(v){ return text(v).toLowerCase().replace(/\s+/g," "); }
function fp(v){ return crypto.createHash("sha256").update(v).digest("hex"); }
function nowHkDate(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Hong_Kong",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function legacyStatus(row){
  const old = text(row.status).toLowerCase();
  const start = hkParts(row.start_time).date;
  const end = hkParts(row.end_time).date || start;
  const expired = end ? end < nowHkDate() : false;
  if (old === "approved") return expired ? "archived" : "published";
  if (old === "offline") return "archived";
  if (old === "pending") return "submitted";
  return "draft";
}
function gallery(row){
  const urls = arr(row.images).filter(x=>/^https?:\/\//i.test(x));
  const cover = text(row.image_url || row.cover_image);
  return [...new Set([cover,...urls].filter(Boolean))].slice(0,6);
}
function mapRow(row, merchant){
  const start = hkParts(row.start_time);
  const end = hkParts(row.end_time);
  const registration = text(row.external_registration_url || row.registration_link || row.external_link);
  const official = text(row.external_link || row.registration_link || row.external_registration_url);
  const imgs = gallery(row);
  const status = legacyStatus(row);
  const merchantName = text(merchant?.business_name || merchant?.name);
  return {
    title_tc:text(row.title),
    title:text(row.title_en || row.title),
    short_description_tc:text(row.meta_description || row.description).slice(0,220) || null,
    description_tc:text(row.description) || null,
    organizer_name:merchantName || null,
    cover_image_url:imgs[0] || null,
    gallery_image_urls:imgs,
    start_date:start.date,
    end_date:end.date || start.date,
    start_time:start.time,
    end_time:end.time,
    venue_name:text(row.location) || null,
    address:text(row.address) || null,
    district:text(row.district_id) || null,
    area:text(row.area_id) || null,
    google_map_url:text(row.google_map_url) || null,
    latitude:row.latitude == null ? null : Number(row.latitude),
    longitude:row.longitude == null ? null : Number(row.longitude),
    age_min:row.age_min ?? null,
    age_max:row.age_max ?? null,
    category:text(row.category) || null,
    tags:arr(row.tags),
    is_free:Boolean(row.is_free),
    is_sen_friendly:Boolean(row.is_sen_friendly),
    is_featured:Boolean(row.is_featured),
    registration_required:Boolean(row.requires_booking),
    registration_url:registration || null,
    official_url:official || null,
    source_url:official || null,
    cta_type:registration ? "official" : "none",
    cta_label:registration ? "查看官方活動頁" : null,
    show_on_calendar:row.show_on_calendar !== false,
    transportation_notes:text(row.transport_info) || null,
    highlights:text(row.highlights) || null,
    remarks:text(row.other_info) || null,
    status,
    published_at:status === "published" ? (row.published_at || row.first_published_at || row.updated_at || row.created_at) : null,
    created_at:row.created_at || new Date().toISOString(),
    updated_at:row.updated_at || new Date().toISOString(),
    source_type:official ? "url" : "manual",
    source_fingerprint:fp("legacy-activity:"+row.id),
    auto_import_note:"Migrated from legacy Supabase activity "+row.id,
    merchant_id:null,
    platform_takes_booking:false,
    platform_takes_payment:false
  };
}
async function allRows(client, table, columns="*"){
  const out=[];
  for(let from=0;;from+=BATCH_SIZE){
    const {data,error}=await client.from(table).select(columns).range(from,from+BATCH_SIZE-1);
    if(error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data||[]));
    if(!data || data.length < BATCH_SIZE) break;
  }
  return out;
}
async function createIssue(report){
  const token=process.env.GITHUB_TOKEN || "";
  const repo=process.env.GITHUB_REPOSITORY || "";
  if(!token || !repo) return;
  const body = [
    "## Legacy HK Family Fun migration dry-run",
    "",
    `- Old activities: **${report.oldTotal}**`,
    `- New events before migration: **${report.newTotal}**`,
    `- Exact source URL duplicates: **${report.sourceDuplicates}**`,
    `- Title/date/venue duplicates: **${report.semanticDuplicates}**`,
    `- Planned inserts: **${report.plannedInserts}**`,
    `- Planned updates/skips: **${report.skipped}**`,
    `- Current/future legacy records: **${report.currentFuture}**`,
    `- Expired legacy records: **${report.expired}**`,
    `- Missing start date: **${report.missingStartDate}**`,
    `- Missing image: **${report.missingImage}**`,
    "",
    APPLY ? "### Migration mode: APPLY" : "### Migration mode: DRY RUN ONLY",
    "",
    "No merchant login accounts are migrated by this workflow. Legacy merchant IDs are intentionally detached from events."
  ].join("\n");
  await fetch(`https://api.github.com/repos/${repo}/issues`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json","Content-Type":"application/json"},
    body:JSON.stringify({title:APPLY?"HKFF legacy migration completed":"HKFF legacy migration dry-run report",body,assignees:["familyfunhongkong-game"]})
  });
}
async function main(){
  const [activities,merchants,newEvents]=await Promise.all([
    allRows(oldDb,"activities"),
    allRows(oldDb,"merchants","id,name,business_name,email,contact_email,website_url,status"),
    allRows(newDb,"events","id,title_tc,start_date,venue_name,source_url,official_url,registration_url,source_fingerprint,status")
  ]);
  const merchantsById=new Map(merchants.map(m=>[m.id,m]));
  const existingUrls=new Set();
  const semantic=new Set();
  for(const e of newEvents){
    for(const u of [e.source_url,e.official_url,e.registration_url]){
      if(text(u)) existingUrls.add(text(u));
    }
    semantic.add([norm(e.title_tc),text(e.start_date),norm(e.venue_name)].join("|"));
  }

  let sourceDuplicates=0, semanticDuplicates=0, skipped=0, currentFuture=0, expired=0, missingStartDate=0, missingImage=0;
  const inserts=[];
  const today=nowHkDate();

  for(const row of activities){
    const mapped=mapRow(row,merchantsById.get(row.merchant_id));
    if(!mapped.start_date) missingStartDate++;
    if(!mapped.cover_image_url) missingImage++;
    const end=mapped.end_date || mapped.start_date;
    if(end && end >= today) currentFuture++; else if(end) expired++;

    const urls=[mapped.source_url,mapped.official_url,mapped.registration_url].filter(Boolean);
    if(urls.some(u=>existingUrls.has(u))){
      sourceDuplicates++; skipped++; continue;
    }
    const key=[norm(mapped.title_tc),text(mapped.start_date),norm(mapped.venue_name)].join("|");
    if(semantic.has(key)){
      semanticDuplicates++; skipped++; continue;
    }
    inserts.push(mapped);
    semantic.add(key);
  }

  if(APPLY && inserts.length){
    for(let i=0;i<inserts.length;i+=50){
      const chunk=inserts.slice(i,i+50);
      const {error}=await newDb.from("events").insert(chunk);
      if(error) throw new Error("Insert batch failed: "+error.message);
    }
  }

  const report={
    oldTotal:activities.length,
    newTotal:newEvents.length,
    sourceDuplicates,
    semanticDuplicates,
    plannedInserts:inserts.length,
    skipped,
    currentFuture,
    expired,
    missingStartDate,
    missingImage,
    apply:APPLY
  };
  console.log(JSON.stringify(report,null,2));
  await createIssue(report);
}
main().catch(err=>{console.error(err);process.exit(1);});

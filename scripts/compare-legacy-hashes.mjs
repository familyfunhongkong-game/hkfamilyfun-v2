"use strict";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const NEW_URL = process.env.SUPABASE_URL || "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!NEW_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const db = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession:false, autoRefreshToken:false }
});

function clean(v){ return v == null ? "" : String(v).trim(); }
function norm(v){ return clean(v).toLowerCase().replace(/\s+/g," "); }
function md5(v){ return crypto.createHash("md5").update(v).digest("hex"); }

async function allRows(){
  const out=[];
  for(let from=0;;from+=200){
    const {data,error}=await db.from("events")
      .select("id,title_tc,start_date,venue_name,source_url,official_url,registration_url,status")
      .range(from,from+199);
    if(error) throw new Error(error.message);
    out.push(...(data||[]));
    if(!data || data.length<200) break;
  }
  return out;
}

function countBy(values){
  const m=new Map();
  for(const v of values){
    if(!v) continue;
    m.set(v,(m.get(v)||0)+1);
  }
  return m;
}

const legacy=JSON.parse(await fs.readFile("migration/legacy-event-hashes.json","utf8")).rows;
const current=await allRows();

const newHashed=current.map(e=>{
  const semantic=md5(
    norm(e.title_tc)+"|"+clean(e.start_date)+"|"+norm(e.venue_name)
  );
  const source=clean(e.source_url||e.official_url||e.registration_url);
  return {
    id:e.id,
    semantic_hash:semantic,
    source_hash:source ? md5(source) : null,
    status:e.status
  };
});

const oldSourceCount=countBy(legacy.map(x=>x.source_hash));
const newSourceCount=countBy(newHashed.map(x=>x.source_hash));

const newSemantic=new Set(newHashed.map(x=>x.semantic_hash));
const newSourceUnique=new Set(
  [...newSourceCount.entries()].filter(([,n])=>n===1).map(([h])=>h)
);

const seenOldSemantic=new Set();
let oldInternalDuplicateRows=0;
let semanticOverlap=0;
let uniqueSourceOverlap=0;
let plannedUnique=0;
let currentFutureUnique=0;
let expiredUnique=0;
let missingDateUnique=0;
let uniqueWithImage=0;

for(const row of legacy){
  if(seenOldSemantic.has(row.semantic_hash)){
    oldInternalDuplicateRows++;
    continue;
  }
  seenOldSemantic.add(row.semantic_hash);

  const semMatch=newSemantic.has(row.semantic_hash);
  const sourceMatch=
    row.source_hash &&
    oldSourceCount.get(row.source_hash)===1 &&
    newSourceUnique.has(row.source_hash);

  if(semMatch){
    semanticOverlap++;
    continue;
  }
  if(sourceMatch){
    uniqueSourceOverlap++;
    continue;
  }

  plannedUnique++;
  if(row.date_class==="current_future") currentFutureUnique++;
  else if(row.date_class==="expired") expiredUnique++;
  else missingDateUnique++;
  if(row.has_image) uniqueWithImage++;
}

const report={
  old_total:legacy.length,
  old_unique_semantic:seenOldSemantic.size,
  old_internal_duplicate_rows:oldInternalDuplicateRows,
  new_total:current.length,
  semantic_overlap:semanticOverlap,
  unique_source_overlap:uniqueSourceOverlap,
  existing_overlap_total:semanticOverlap+uniqueSourceOverlap,
  planned_unique_migration:plannedUnique,
  planned_current_future:currentFutureUnique,
  planned_expired:expiredUnique,
  planned_missing_date:missingDateUnique,
  planned_with_image:uniqueWithImage
};

console.log(JSON.stringify(report,null,2));

const token=process.env.GITHUB_TOKEN||"";
const repo=process.env.GITHUB_REPOSITORY||"";
if(token && repo){
  const body=[
    "## HK Family Fun legacy migration exact dry-run",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Old activities | ${report.old_total} |`,
    `| Old unique after internal dedupe | ${report.old_unique_semantic} |`,
    `| Old duplicate rows removed | ${report.old_internal_duplicate_rows} |`,
    `| New V2 events | ${report.new_total} |`,
    `| Already in V2 by semantic match | ${report.semantic_overlap} |`,
    `| Already in V2 by unique URL match | ${report.unique_source_overlap} |`,
    `| **Planned migration** | **${report.planned_unique_migration}** |`,
    `| Planned current/future | ${report.planned_current_future} |`,
    `| Planned expired/history | ${report.planned_expired} |`,
    `| Planned missing date | ${report.planned_missing_date} |`,
    `| Planned records with image | ${report.planned_with_image} |`,
    "",
    "No legacy data was inserted or modified by this dry-run."
  ].join("\n");
  const res=await fetch(`https://api.github.com/repos/${repo}/issues`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      Accept:"application/vnd.github+json",
      "Content-Type":"application/json",
      "X-GitHub-Api-Version":"2022-11-28"
    },
    body:JSON.stringify({
      title:"HKFF legacy migration exact dry-run",
      body,
      assignees:["familyfunhongkong-game"]
    })
  });
  if(!res.ok) console.warn("Issue create failed",res.status,await res.text());
}

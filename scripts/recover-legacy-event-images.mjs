"use strict";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_EVENTS = Number(process.env.MAX_EVENTS || "40");

if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(String(value || "").trim(), baseUrl).toString();
  } catch {
    return "";
  }
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractMetaImage(html) {
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  const wanted = new Set([
    "og:image",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  ]);

  for (const tag of tags) {
    const prop =
      tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1] || "";

    if (wanted.has(prop) && content) return htmlDecode(content);
  }

  return "";
}

async function fetchPage(url) {
  try {
    return await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HKFamilyFunMigrationBot/1.0; +https://hkfamilyfun.com)",
        "accept-language": "zh-HK,zh;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,image/*,*/*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }
}

async function recoverImage(sourceUrl) {
  const page = await fetchPage(sourceUrl);
  if (!page || !page.ok) return null;

  const pageType = (page.headers.get("content-type") || "").toLowerCase();

  if (pageType.startsWith("image/")) {
    const bytes = new Uint8Array(await page.arrayBuffer());
    return {
      bytes,
      contentType: pageType.split(";")[0],
      imageUrl: page.url || sourceUrl,
      pageUrl: sourceUrl,
    };
  }

  if (!pageType.includes("text/html")) return null;

  const html = (await page.text()).slice(0, 3000000);
  const metaImage = extractMetaImage(html);
  if (!metaImage) return null;

  const candidate = absoluteUrl(metaImage, page.url || sourceUrl);
  if (!candidate) return null;

  let imageResponse;
  try {
    imageResponse = await fetch(candidate, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HKFamilyFunMigrationBot/1.0; +https://hkfamilyfun.com)",
        accept: "image/*,*/*;q=0.5",
        referer: page.url || sourceUrl,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }

  if (!imageResponse.ok) return null;

  const contentType = (imageResponse.headers.get("content-type") || "")
    .toLowerCase()
    .split(";")[0];

  if (!contentType.startsWith("image/")) return null;

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return null;

  return {
    bytes,
    contentType,
    imageUrl: imageResponse.url || candidate,
    pageUrl: page.url || sourceUrl,
  };
}

function extensionFor(contentType) {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  return "jpg";
}

async function main() {
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,title_tc,official_url,source_url,event_url,registration_url,status,cover_image_url,gallery_image_urls,admin_review_note,ai_extracted_json",
    )
    .eq("status", "draft")
    .eq("ai_extracted_json->>legacy_migration", "true")
    .eq("ai_extracted_json->>legacy_status", "approved")
    .eq("ai_extracted_json->>legacy_date_class", "current_future")
    .limit(MAX_EVENTS);

  if (error) throw error;

  const report = {
    candidates: events?.length || 0,
    recovered: 0,
    keptDraft: 0,
    failed: 0,
    details: [],
  };

  for (const event of events || []) {
    if ((event.cover_image_url || "").trim()) continue;

    const source =
      event.official_url ||
      event.source_url ||
      event.event_url ||
      event.registration_url ||
      "";

    if (!/^https?:\/\//i.test(source)) {
      report.failed++;
      report.details.push({
        title: event.title_tc,
        result: "no usable source URL",
      });
      continue;
    }

    const found = await recoverImage(source);

    if (!found) {
      report.failed++;
      report.details.push({
        title: event.title_tc,
        result: "official/source image not found",
      });
      continue;
    }

    const ext = extensionFor(found.contentType);
    const path = "legacy-recovery/" + event.id + "/cover." + ext;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(path, found.bytes, {
        contentType: found.contentType,
        upsert: true,
        cacheControl: "31536000",
      });

    if (uploadError) {
      report.failed++;
      report.details.push({
        title: event.title_tc,
        result: "upload failed: " + uploadError.message,
      });
      continue;
    }

    const publicData = supabase.storage.from("event-images").getPublicUrl(path);
    const publicUrl = publicData.data?.publicUrl || "";

    if (!publicUrl) {
      report.failed++;
      report.details.push({
        title: event.title_tc,
        result: "public URL generation failed",
      });
      continue;
    }

    const existingGallery = Array.isArray(event.gallery_image_urls)
      ? event.gallery_image_urls
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];
    const nextGallery = [...new Set([publicUrl, ...existingGallery])].slice(0, 6);
    const recoveryNote =
      "Legacy image recovered automatically from official/source page: " +
      found.pageUrl +
      ". Event remains draft and requires Admin review before approval/publication.";
    const previousNote = String(event.admin_review_note || "").trim();

    const { error: eventUpdateError } = await supabase
      .from("events")
      .update({
        cover_image_url: publicUrl,
        gallery_image_urls: nextGallery,
        admin_review_note: previousNote
          ? previousNote + "\n\n" + recoveryNote
          : recoveryNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (eventUpdateError) {
      report.failed++;
      report.details.push({
        title: event.title_tc,
        result: "event update failed: " + eventUpdateError.message,
      });
      continue;
    }

    report.recovered++;
    report.keptDraft++;

    report.details.push({
      title: event.title_tc,
      result: "image recovered; draft retained for Admin review",
    });

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  console.log(JSON.stringify(report, null, 2));

  const token = process.env.GITHUB_TOKEN || "";
  const repository = process.env.GITHUB_REPOSITORY || "";

  if (token && repository) {
    const lines = [
      "## HK Family Fun legacy image recovery",
      "",
      "- Candidates: **" + report.candidates + "**",
      "- Images recovered: **" + report.recovered + "**",
      "- Kept as draft for Admin review: **" + report.keptDraft + "**",
      "- Failed source recovery: **" + report.failed + "**",
      "",
      ...report.details.map(
        (item) => "- **" + (item.title || "Untitled") + "** — " + item.result,
      ),
    ];

    await fetch("https://api.github.com/repos/" + repository + "/issues", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: "HKFF legacy image recovery report",
        body: lines.join("\n"),
        assignees: ["familyfunhongkong-game"],
      }),
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

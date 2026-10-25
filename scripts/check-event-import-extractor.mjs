import assert from "node:assert/strict";
import { extractStructuredPageDetails, parseCurrencyPrice } from "../lib/event-import-page-extractor.js";

const html = `
<!doctype html>
<html lang="zh-HK">
<head>
  <meta property="og:title" content="《嘔心食物博物館》香港站" />
  <meta property="og:image" content="https://m1.airside.com.hk/disgusting-food.jpg" />
</head>
<body>
  <main>
    <h2>《嘔心食物博物館》香港站</h2>
    <p>日期及時間</p>
    <p>29.09.2026 - 26.11.2026</p>
    <p>周一至周四 12pm - 7pm</p>
    <p>周五至周日 11am - 8pm</p>
    <p>地點</p>
    <p>312號舖GATE33藝文館</p>
    <p>價錢</p>
    <p>$68</p>
    <ul>
      <li>來自瑞典的嘔心食物博物館，香港首度舉辦，帶來世界各地獨特飲食文化。</li>
      <li>近距離探索 80+款世界奇葩美食，由發酵食品到昆蟲逐一大開眼界。</li>
      <li>穿梭 5大主題區域，探索世界飲食文化差異以及食物背後的故事。</li>
      <li>透過互動展品及多感官體驗，睇、聞、探索各地不同飲食文化。</li>
      <li>試食吧可親嚐世界各地特色食物，體驗展覽的互動環節。</li>
    </ul>
    <p>購票連結：<a href="https://bit.ly/4ymG5iI">https://bit.ly/4ymG5iI</a></p>
  </main>
</body>
</html>`;

const result = extractStructuredPageDetails(
  html,
  "https://www.airside.com.hk/zh-hk/happenings/disgusting-food-museum",
);

assert.equal(result.price?.price_display_mode, "fixed");
assert.equal(result.price?.price_label, "HK$68");
assert.equal(result.price?.min_price, "68");
assert.equal(result.price?.max_price, "68");

assert.equal(result.startDate, "2026-09-29");
assert.equal(result.endDate, "2026-11-26");

assert.equal(result.venueName, "312號舖GATE33藝文館");
assert.equal(result.address, "AIRSIDE 312號舖GATE33藝文館");

assert.equal(
  result.scheduleText,
  "周一至周四 12pm - 7pm；周五至周日 11am - 8pm",
);
assert.equal(result.startTime, "");
assert.equal(result.endTime, "");

assert.equal(result.bookingUrl, "https://bit.ly/4ymG5iI");
assert.equal(result.highlights.length, 5);
assert.match(result.highlights[0], /瑞典/);

const simplePrice = parseCurrencyPrice("價錢 $68");
assert.equal(simplePrice?.price_label, "HK$68");

const hkPrice = parseCurrencyPrice("票價 HK$120");
assert.equal(hkPrice?.price_label, "HK$120");

const hkdPrice = parseCurrencyPrice("Price: HKD 520.00 / 4 person, +HKD 140 per additional person");
assert.equal(hkdPrice?.price_display_mode, "fixed");
assert.equal(hkdPrice?.price_label, "HK$520 / 4人；額外每人 HK$140");
assert.equal(hkdPrice?.min_price, "520");
assert.equal(hkdPrice?.max_price, "520");


import { validateEventUpload } from "../lib/event-upload-validation.js";
import { readFileSync } from "node:fs";

const importPage = readFileSync("app/merchant/events/import/page.tsx", "utf8");
const importApi = readFileSync("app/api/import-event/route.ts", "utf8");
const eventEditor = readFileSync("app/merchant/events/[id]/edit/page.tsx", "utf8");
for (const format of ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']) {
  assert.ok(importPage.includes(format), `Missing accepted upload format: ${format}`);
}
assert.ok(importPage.includes('function readyScore(draft: DraftEvent, hasLocalImage = false)'), 'missing image completeness calculation');
assert.ok(!importPage.includes('getCtaPreview(draft) !== ""'), 'placeholder CTA must not count as completed');
assert.ok(importPage.includes('const adminCreating = currentMerchant.id === "";'), 'Admin save must rely on the resolved actor, not stale React state');
assert.ok(importPage.includes('setSelectedImage(file)'), 'image selection missing');
assert.ok(importPage.includes('client.storage.from("event-images").upload('), 'image upload missing');
assert.ok(importPage.includes('const [sourceType, setSourceType]'), 'import provenance sourceType tracking missing');
assert.ok(importPage.includes('source_type: sourceType'), 'stored source type must match URL, PDF or poster');
assert.ok(importPage.includes('setSourceType("pdf")'), 'PDF must be recorded as PDF evidence');
assert.ok(importPage.includes('setSourceType("url")'), 'URL must be recorded as URL evidence');
assert.ok(importPage.includes('第三方 Reader'), 'PDF third-party processing disclosure missing');
assert.ok(importPage.includes('role="status" aria-live="polite"'), 'inline import feedback is required');
assert.ok(importPage.includes('.eq("id", savedId)'), 'retry must reuse existing draft');
assert.ok(importPage.includes('client.storage.from("event-images").remove([path])'), 'failed image-link update must clean up orphan storage objects');
assert.ok(importPage.includes('PDF（最多 4MB）'), 'PDF picker must respect the Vercel 4.5MB body cap');
assert.ok(importPage.includes('response.status === 413'), 'Gateway 413 payload failures must show actionable UI messages');
assert.ok(importPage.includes('await readImportResponse(response)'), 'HTML gateway errors must not crash JSON parsing');
assert.ok(importPage.includes('const saveInFlight = useRef(false)'), 'rapid Save clicks must be locked');
assert.ok(importPage.includes('saveInFlight.current = true'), 'save lock must be held');
assert.ok(importPage.includes('saveInFlight.current = false'), 'save lock must be cleared');
assert.ok(importPage.includes('savedIdRef.current = data?.id || null'), 'saved draft ID must persist across repeated Save');
assert.ok(!importPage.includes('setSavedId(null)'), 'URL or PDF re-extraction must not orphan existing draft');
assert.ok(eventEditor.includes('validateEventUpload(file.name, signature, file.size)'), 'event editor must validate actual upload bytes');
assert.ok(eventEditor.includes('remove(uploadedPaths)'), 'partially failed gallery batch must be cleaned up');
assert.ok(eventEditor.includes('accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"'), 'event editor must not accept arbitrary SVG/GIF files');

assert.ok(importApi.includes("validateEventUpload(fileName, header, uploaded.size)"), "PDF server validation must use shared utility");
assert.ok(importPage.includes("validateEventUpload(file.name, header, file.size)"), "image picker must use shared utility");
assert.ok(importApi.includes('const chineseRange = text.match('), 'Chinese date-range fallback missing');
assert.ok(importApi.includes('Reader 後備抽取'), 'reader fallback missing');
assert.ok(importApi.includes("isChallengeTitle(event.title_tc)"), "Bot challenge HTML must not be imported as an event");


const bytes = (...values) => new Uint8Array(values);
assert.equal(validateEventUpload("event.png", bytes(137,80,78,71,13,10,26,10), 1024).kind, "image");
assert.equal(validateEventUpload("event.JPG", bytes(255,216,255), 1024).kind, "image");
assert.equal(validateEventUpload("event.jpeg", bytes(255,216,255), 1024).mime, "image/jpeg");
assert.equal(validateEventUpload("event.webp", bytes(82,73,70,70,0,0,0,0,87,69,66,80), 1024).kind, "image");
assert.equal(validateEventUpload("event.pdf", bytes(37,80,68,70,45), 2048).kind, "pdf");
assert.equal(validateEventUpload("event.png", bytes(137), 1).kind, null, "truncated PNG must fail");
assert.equal(validateEventUpload("event.pdf", bytes(37), 1).kind, null, "truncated PDF must fail");
assert.equal(validateEventUpload("event.pdf", bytes(137,80,78,71,13,10,26,10), 2048).kind, null, "renamed PNG must fail");
assert.equal(validateEventUpload("event.png", bytes(137,80,78,71,13,10,26,10), 9 * 1024 * 1024).kind, null, "oversize images must fail");
assert.equal(validateEventUpload("event.pdf", bytes(37,80,68,70,45), 5 * 1024 * 1024).kind, null, "oversize PDFs must fail");
assert.equal(validateEventUpload("event.svg", bytes(60,115,118,103), 4096).kind, null, "SVG must never be treated as a safe raster image");

console.log("Event import extractor and common upload contract passed.");

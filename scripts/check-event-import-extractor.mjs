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

console.log("Event import extractor contract passed.");

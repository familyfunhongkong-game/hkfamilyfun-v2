const recurrenceSample = "星期三至星期日 13:00–18:00";
const cleanedRecurrence = recurrenceSample
  .replace(
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:-|–|—|至|to)\s*\d{1,2}:\d{2}(?::\d{2})?\b/gi,
    "",
  )
  .replace(/\s*[|｜,，;；]+\s*$/g, "")
  .replace(/\s{2,}/g, " ")
  .trim();

if (cleanedRecurrence !== "星期三至星期日") {
  console.error("[event-mobile-content] recurring date note still contains time:", cleanedRecurrence);
  process.exit(1);
}

const sampleHighlights = JSON.parse(
  '[{"en":"","zh_cn":"","zh_hk":"家庭友善"},{"en":"","zh_cn":"","zh_hk":"創意體驗"}]',
);

function pick(value, keys) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => pick(item, keys)).filter(Boolean).join("\n");
  if (typeof value === "object") {
    for (const key of keys) {
      const result = pick(value[key], keys);
      if (result) return result;
    }
  }
  return "";
}

const normalizedHighlights = pick(sampleHighlights, [
  "zh_hk",
  "zh-HK",
  "zh_hant",
  "zh-Hant",
  "tc",
  "zh_cn",
  "zh-CN",
  "sc",
  "en",
]);

if (normalizedHighlights !== "家庭友善\n創意體驗") {
  console.error("[event-mobile-content] structured highlights normalization failed:", normalizedHighlights);
  process.exit(1);
}

console.log("[event-mobile-content] OK — recurring date/time are separated and multilingual highlight arrays render as human text.");

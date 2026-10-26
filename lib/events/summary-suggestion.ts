/** Fact-preserving, zero-API-cost event-summary suggestion. Never adds activity claims. */
export type SummaryStyle = "points" | "story" | "simple";
const clean = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
const pieces = (source: string) => source.split(/(?:[。！？!?；;]|\n|(?<=\S)\s*[•●▪]\s*)/u).map(clean).filter(s => s.length >= 8 && s.length <= 180);
const iconFor = (s: string) => /閱讀|圖書|故事|書/.test(s) ? "📚" : /藝術|畫|手工|創作/.test(s) ? "🎨" : /戶外|自然|生態/.test(s) ? "🌿" : /運動|體育/.test(s) ? "🏃" : /音樂|唱歌/.test(s) ? "🎵" : /科學|實驗/.test(s) ? "🔬" : "✨";
export function suggestEventCopy(source: string, style: SummaryStyle, emoji: boolean, maxChars: number) {
  const unique = [...new Set(pieces(source))];
  if (!unique.length) return { summary: "", highlights: "", warning: "未有足夠活動原文，請先輸入詳細介紹；系統不會虛構活動內容。" };
  const opening = unique[0].slice(0, Math.min(50, maxChars));
  const points = unique.slice(1, 5);
  const bullet = (s: string) => (emoji ? iconFor(s) : "•") + " " + s;
  let summary = style === "points"
    ? [opening, ...points.slice(0, 3).map(bullet)].join("\n")
    : style === "story"
      ? unique.slice(0, 3).join("。") + "。"
      : unique.slice(0, 3).join("；");
  if (summary.length > maxChars) {
    const lines = summary.split("\n");
    while (lines.length > 1 && lines.join("\n").length > maxChars) lines.pop();
    summary = lines.join("\n").slice(0, maxChars).replace(/[，；、\s]+$/u, "");
  }
  const highlights = points.filter(p => !summary.includes(p)).slice(0, 5).map(bullet).join("\n");
  return { summary, highlights, warning: "草稿只整理原文，請於審批前核實來源、完整意思及重要限制；不會自動發布。" };
}

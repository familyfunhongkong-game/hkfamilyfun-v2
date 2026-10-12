const TAG_TONES = [
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-orange-50 text-orange-700 ring-orange-100",
  "bg-amber-50 text-amber-800 ring-amber-100",
  "bg-lime-50 text-lime-700 ring-lime-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-teal-50 text-teal-700 ring-teal-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "bg-sky-50 text-sky-700 ring-sky-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
] as const;

export function tagTone(tag: string) {
  const normalized = String(tag || "").trim().toLocaleLowerCase("zh-HK");
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return TAG_TONES[hash % TAG_TONES.length];
}

export function displayTag(tag: string) {
  const normalized = String(tag || "").trim().replace(/^#+/, "");
  return normalized ? `#${normalized}` : "";
}

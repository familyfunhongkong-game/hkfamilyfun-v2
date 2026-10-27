/** Calendar icon catalogue shared by the public calendar and Merchant/Admin editor.
 * Icons are default fallbacks. Real approved cover images take precedence.
 * Category is separate from price / SEN / booking status badges.
 */
export const CALENDAR_EVENT_ICONS = [
  {
    "id": "arts_crafts",
    "label": "藝術及手作",
    "emoji": "🎨",
    "color": "#A855F7"
  },
  {
    "id": "stem",
    "label": "科學及 STEM",
    "emoji": "🔬",
    "color": "#2563EB"
  },
  {
    "id": "reading",
    "label": "閱讀及故事",
    "emoji": "📚",
    "color": "#0D9488"
  },
  {
    "id": "music",
    "label": "音樂及唱遊",
    "emoji": "🎵",
    "color": "#D946EF"
  },
  {
    "id": "performance",
    "label": "戲劇及表演",
    "emoji": "🎭",
    "color": "#DB2777"
  },
  {
    "id": "sports",
    "label": "運動及體能",
    "emoji": "⚽",
    "color": "#EA580C"
  },
  {
    "id": "outdoors",
    "label": "戶外及行山",
    "emoji": "🥾",
    "color": "#15803D"
  },
  {
    "id": "nature",
    "label": "自然及生態",
    "emoji": "🌿",
    "color": "#16A34A"
  },
  {
    "id": "farm_animals",
    "label": "農莊及動物",
    "emoji": "🐑",
    "color": "#65A30D"
  },
  {
    "id": "museum",
    "label": "博物館及展覽",
    "emoji": "🏛️",
    "color": "#64748B"
  },
  {
    "id": "theme_park",
    "label": "主題樂園",
    "emoji": "🎡",
    "color": "#E11D48"
  },
  {
    "id": "indoor_play",
    "label": "室內遊樂",
    "emoji": "🧸",
    "color": "#F97316"
  },
  {
    "id": "water",
    "label": "游泳及水上活動",
    "emoji": "🏊",
    "color": "#0284C7"
  },
  {
    "id": "food_cooking",
    "label": "烹飪及飲食",
    "emoji": "👩‍🍳",
    "color": "#CA8A04"
  },
  {
    "id": "festival",
    "label": "節日及嘉年華",
    "emoji": "🎪",
    "color": "#DC2626"
  },
  {
    "id": "holiday",
    "label": "節慶限定",
    "emoji": "🎃",
    "color": "#C2410C"
  },
  {
    "id": "parent_workshop",
    "label": "家長講座及工作坊",
    "emoji": "👨‍👩‍👧",
    "color": "#7C3AED"
  },
  {
    "id": "baby_toddler",
    "label": "嬰幼兒活動",
    "emoji": "👶",
    "color": "#DB2777"
  },
  {
    "id": "sen_friendly",
    "label": "SEN 共融活動",
    "emoji": "🧩",
    "color": "#0F766E"
  },
  {
    "id": "community",
    "label": "社區及義工",
    "emoji": "🤝",
    "color": "#0891B2"
  },
  {
    "id": "charity",
    "label": "慈善及公益",
    "emoji": "💝",
    "color": "#BE185D"
  },
  {
    "id": "tourism",
    "label": "旅遊及本地文化",
    "emoji": "🗺️",
    "color": "#4F46E5"
  },
  {
    "id": "education",
    "label": "學習及教育",
    "emoji": "✏️",
    "color": "#2563EB"
  },
  {
    "id": "technology",
    "label": "科技及數碼",
    "emoji": "🤖",
    "color": "#475569"
  },
  {
    "id": "market",
    "label": "市集及購物",
    "emoji": "🛍️",
    "color": "#C026D3"
  },
  {
    "id": "transport",
    "label": "交通及交通工具",
    "emoji": "🚂",
    "color": "#B45309"
  },
  {
    "id": "cinema",
    "label": "電影及放映",
    "emoji": "🎬",
    "color": "#334155"
  },
  {
    "id": "family_day",
    "label": "家庭同樂日",
    "emoji": "🎈",
    "color": "#E11D48"
  },
  {
    "id": "other",
    "label": "其他活動",
    "emoji": "📅",
    "color": "#64748B"
  }
] as const;

export type CalendarIconId = (typeof CALENDAR_EVENT_ICONS)[number]["id"];
export type CalendarEventIcon = (typeof CALENDAR_EVENT_ICONS)[number];
const byId = new Map<string, CalendarEventIcon>(CALENDAR_EVENT_ICONS.map((icon) => [icon.id, icon]));
const ALIASES: Record<string, CalendarIconId> = {
  "kids": "family_day",
  "parent_child": "family_day",
  "family": "family_day",
  "親子活動": "family_day",
  "亲子活动": "family_day",
  "family activity": "family_day",
  "workshop": "arts_crafts",
  "工作坊": "arts_crafts",
  "藝術創作": "arts_crafts",
  "艺术创作": "arts_crafts",
  "arts": "arts_crafts",
  "arts_event": "arts_crafts",
  "文化藝術": "arts_crafts",
  "文化艺术": "arts_crafts",
  "digital_art": "arts_crafts",
  "數碼藝術": "arts_crafts",
  "science": "stem",
  "stem": "stem",
  "reading": "reading",
  "story": "reading",
  "music": "music",
  "音樂": "music",
  "音乐": "music",
  "theatre": "performance",
  "劇場": "performance",
  "剧场": "performance",
  "light_show": "performance",
  "sports": "sports",
  "運動": "sports",
  "运动": "sports",
  "outdoor": "outdoors",
  "戶外活動": "outdoors",
  "户外活动": "outdoors",
  "nature": "nature",
  "farm": "farm_animals",
  "museum": "museum",
  "exhibition": "museum",
  "展覽": "museum",
  "展览": "museum",
  "family_exhibition": "museum",
  "themepark": "theme_park",
  "indoor": "indoor_play",
  "室內活動": "indoor_play",
  "室内活动": "indoor_play",
  "family_entertainment": "indoor_play",
  "cooking": "food_cooking",
  "烹飪": "food_cooking",
  "烹饪": "food_cooking",
  "festival": "festival",
  "節慶活動": "festival",
  "节庆活动": "festival",
  "fair": "festival",
  "嘉年華": "festival",
  "嘉年华": "festival",
  "parenting": "parent_workshop",
  "sen": "sen_friendly",
  "education": "education",
  "教育活動": "education",
  "教育活动": "education",
  "market": "market",
  "市集": "market",
  "mall": "market",
  "商場活動": "market",
  "cultural_event": "tourism",
  "文化活動": "tourism",
  "文化活动": "tourism"
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getCalendarEventIcon(input: { category?: unknown; title?: unknown }): CalendarEventIcon {
  const category = normalize(input.category);
  const mapped = byId.get(category) || byId.get(ALIASES[category] || "");
  if (mapped) return mapped;
  // Only fall back to title hints for generic or missing legacy categories.
  if (!category || ["family", "kids", "parent_child", "親子活動", "亲子活动", "family activity"].includes(category)) {
    const title = normalize(input.title);
    const hints: Array<[RegExp, CalendarIconId]> = [
      [/故事|繪本|绘本|閱讀|阅读|story|book/, "reading"],
      [/科學|科学|stem|實驗|实验|robot|機械人|机器人/, "stem"],
      [/藝術|艺术|手作|手工|畫畫|绘画|art|craft/, "arts_crafts"],
      [/博物館|博物馆|展覽|展览|museum|exhibition/, "museum"],
      [/農莊|农庄|動物|动物|farm|animal/, "farm_animals"],
      [/行山|遠足|远足|hiking|nature|生態|生态/, "nature"],
      [/音樂|音乐|唱遊|唱游|music|concert/, "music"],
      [/劇場|剧场|話劇|话剧|戲劇|戏剧|theatre|show/, "performance"],
      [/市集|market|bazaar/, "market"],
      [/嘉年華|嘉年华|festival|carnival/, "festival"],
      [/萬聖節|万圣节|halloween/, "holiday"],
      [/親子工作坊|亲子工作坊|parenting|家長講座|家长讲座/, "parent_workshop"],
      [/泳|水上|water park|swim/, "water"],
      [/運動|运动|足球|籃球|篮球|sports/, "sports"],
      [/樂園|乐园|theme park|disney/, "theme_park"],
    ];
    const hint = hints.find(([pattern]) => pattern.test(title));
    if (hint) return byId.get(hint[1])!;
  }
  return byId.get("other")!;
}

export function getCalendarThumbnailUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (["placehold.co", "placehold.it", "via.placeholder.com"].includes(parsed.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

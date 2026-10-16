// Read-only KPI modeling for authenticated HK Family Fun Admin reporting.
// This intentionally does not model browser-local favorites as global saves.
export type EventKpiRow = {
  id: string;
  title_tc: string | null;
  title: string | null;
  status: string | null;
  activity_category: string | null;
  category: string | null;
  district: string | null;
  is_free: boolean | null;
  is_sen_friendly: boolean | null;
  created_at: string;
  published_at: string | null;
  merchant_id: string | null;
  start_date: string | null;
  end_date: string | null;
};
export type MerchantKpiRow = {
  id: string;
  business_name: string;
  status: string;
  created_at: string;
  owner_user_id: string | null;
  contact_email: string | null;
};
export type AccountKpiRow = {
  id: string;
  email: string | null;
  created_at: string;
};
export type AdminKpiRow = { user_id: string | null; email: string; status: string };
export type DayKpiRow = { date: string; pageViews: number; accountSignups: number; merchantSignups: number; eventsCreated: number };

export function hkDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Hong_Kong",
  }).format(new Date(iso));
}
export function last30HongKongDays(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (kind: string) => Number(parts.find(x => x.type === kind)?.value || 0);
  const start = Date.UTC(part("year"), part("month") - 1, part("day") - 29);
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start + index * 86400000);
    return day.toISOString().slice(0, 10);
  });
}
function countsBy<T>(items: T[], get: (item: T) => string) {
  const groups = new Map<string, number>();
  for (const item of items) {
    const label = get(item) || "未分類";
    groups.set(label, (groups.get(label) || 0) + 1);
  }
  return [...groups].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
function safeDay(iso: string | null | undefined) {
  return iso ? hkDate(iso) : "";
}

export function buildGrowthDashboard(
  events: EventKpiRow[],
  merchants: MerchantKpiRow[],
  accounts: AccountKpiRow[],
  admins: AdminKpiRow[],
  dailyPageViews: Array<{ date: string; pageViews: number }>,
  notificationCount: number,
  now = new Date(),
) {
  const adminUserIds = new Set(admins.filter(a => a.status === "active").map(a => a.user_id).filter(Boolean));
  const adminEmails = new Set(admins.filter(a => a.status === "active").map(a => a.email.toLowerCase()));
  const merchantOwners = new Set(merchants.map(m => m.owner_user_id).filter(Boolean));
  const classifiedAccounts = accounts.map(account => {
    const role = adminUserIds.has(account.id) || (account.email && adminEmails.has(account.email.toLowerCase()))
      ? "admin" : merchantOwners.has(account.id) ? "merchant" : "audience";
    return { ...account, role };
  });
  const published = events.filter(e => e.status === "published");
  const merchantsWithEvents = new Map<string, number>();
  for (const event of events) {
    if (event.merchant_id) merchantsWithEvents.set(event.merchant_id, (merchantsWithEvents.get(event.merchant_id) || 0) + 1);
  }
  const merchantStatuses = countsBy(merchants, m => m.status);
  const eventStatuses = countsBy(events, e => e.status || "unknown");
  const days = last30HongKongDays(now);
  const dayMap = new Map<string, DayKpiRow>(days.map(date => [date, {
    date, pageViews: 0, accountSignups: 0, merchantSignups: 0, eventsCreated: 0,
  }]));
  for (const item of dailyPageViews) {
    const bucket = dayMap.get(item.date);
    if (bucket) bucket.pageViews += item.pageViews || 0;
  }
  for (const account of accounts) {
    const bucket = dayMap.get(safeDay(account.created_at));
    if (bucket) bucket.accountSignups++;
  }
  for (const merchant of merchants) {
    const bucket = dayMap.get(safeDay(merchant.created_at));
    if (bucket) bucket.merchantSignups++;
  }
  for (const event of events) {
    const bucket = dayMap.get(safeDay(event.created_at));
    if (bucket) bucket.eventsCreated++;
  }
  const today = days[days.length - 1];
  const activePublished = published.filter(e =>
    e.start_date && e.start_date <= today && (e.end_date || e.start_date) >= today
  ).length;
  const thisMonth = today.slice(0, 7);

  return {
    totals: {
      accounts: accounts.length,
      audienceAccounts: classifiedAccounts.filter(a => a.role === "audience").length,
      adminAccounts: classifiedAccounts.filter(a => a.role === "admin").length,
      merchantAccounts: classifiedAccounts.filter(a => a.role === "merchant").length,
      merchants: merchants.length,
      pendingMerchants: merchants.filter(m => m.status === "pending").length,
      approvedMerchants: merchants.filter(m => m.status === "approved").length,
      events: events.length,
      publishedEvents: published.length,
      draftEvents: events.filter(e => e.status === "draft").length,
      reviewEvents: events.filter(e => ["submitted", "pending_review", "requires_revision"].includes(e.status || "")).length,
      activePublished,
      freePublished: published.filter(e => e.is_free === true).length,
      senPublished: published.filter(e => e.is_sen_friendly === true).length,
      newAccountsMonth: accounts.filter(a => safeDay(a.created_at).startsWith(thisMonth)).length,
      newMerchantsMonth: merchants.filter(m => safeDay(m.created_at).startsWith(thisMonth)).length,
      unreadNotifications: notificationCount,
    },
    eventStatuses,
    merchantStatuses,
    categories: countsBy(published, e => e.activity_category || e.category || "未分類").slice(0, 12),
    allCategories: countsBy(events, e => e.activity_category || e.category || "未分類").slice(0, 12),
    districts: countsBy(published, e => e.district || "未分類").slice(0, 12),
    pricing: [
      { label: "免費活動", count: published.filter(e => e.is_free === true).length },
      { label: "其他／價格未確認", count: published.filter(e => e.is_free !== true).length },
    ],
    trend: [...dayMap.values()],
    merchants: [...merchants].sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 25).map(m => ({
        id: m.id, business_name: m.business_name, status: m.status,
        contact_email: m.contact_email, created_at: m.created_at,
        events: merchantsWithEvents.get(m.id) || 0,
      })),
    recentAccounts: [...classifiedAccounts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20),
    recentEvents: [...events].sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 15).map(e => ({
        id: e.id, title: e.title_tc || e.title || "未命名活動",
        status: e.status || "unknown", category: e.activity_category || e.category || "未分類",
        created_at: e.created_at, merchant_id: e.merchant_id,
      })),
    favorites: {
      available: false,
      reason: "目前收藏只存在各訪客瀏覽器 localStorage，沒有伺服器端收藏資料表；不能推算全站收藏數。",
    },
  };
}

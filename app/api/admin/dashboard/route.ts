import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, serviceClient } from "@/lib/admin-auth";
import { getSiteAnalyticsSummary } from "@/lib/admin-analytics-summary";
import {
  buildGrowthDashboard, hkDate, hongKongDaysInRange,
  type AccountKpiRow, type AdminKpiRow, type EventKpiRow,
  type MerchantKpiRow,
} from "@/lib/admin-growth-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;
const MAX_ACCOUNTS = 10000;

async function allRows<T>(
  db: SupabaseClient, table: string, columns: string,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; offset <= MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await db.from(table).select(columns)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data || []) as T[];
    result.push(...rows);
    if (result.length > MAX_ROWS) {
      throw new Error(`${table} has more than ${MAX_ROWS} records; a database aggregate is required`);
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return result;
}

async function registeredUsers(db: SupabaseClient): Promise<AccountKpiRow[]> {
  const rows: AccountKpiRow[] = [];
  for (let page = 1; page <= Math.ceil(MAX_ACCOUNTS / PAGE_SIZE) + 1; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`auth.users: ${error.message}`);
    const users = data.users || [];
    rows.push(...users.map(user => ({
      id: user.id, email: user.email || null, created_at: user.created_at,
    })));
    if (rows.length > MAX_ACCOUNTS) {
      throw new Error("Registered accounts exceed the current 10,000-account dashboard limit");
    }
    if (users.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Analytics service unavailable" }, { status: 503 });

  try {
    const [events, merchants, accounts, adminRows, unread] = await Promise.all([
      allRows<EventKpiRow>(
        db, "events",
        "id,title_tc,title,status,activity_category,category,district,is_free,is_sen_friendly,created_at,published_at,merchant_id,start_date,end_date",
      ),
      allRows<MerchantKpiRow>(
        db, "merchants", "id,business_name,status,created_at,owner_user_id,contact_email",
      ),
      registeredUsers(db),
      allRows<AdminKpiRow>(
        db, "admin_users", "user_id,email,status,created_at",
      ),
      // Notifications are intentionally readable through the authenticated
      // Admin JWT / RLS, not the service_role key (which has no SELECT grant).
      admin.client.from("platform_notifications").select("id", { head: true, count: "exact" })
        .eq("recipient_scope", "admin").is("read_at", null),
    ]);
    // Notification counting is auxiliary. A failed optional count must not
    // hide all real accounts, merchants and activity charts from the owner.
    let unreadCount: number | null = unread.error ? null : unread.count;
    if (unreadCount === null) {
      console.warn("Growth Dashboard notification count unavailable; trying bounded fallback");
      const backup = await admin.client.from("platform_notifications").select("id")
        .eq("recipient_scope", "admin").is("read_at", null)
        .limit(1000);
      if (!backup.error && backup.data && backup.data.length < 1000) {
        unreadCount = backup.data.length;
      }
    }

    const currentDay = hkDate(new Date().toISOString());
    const preset = request.nextUrl.searchParams.get('range') || '30';
    const allowed = ['7','30','90','365','custom'];
    if (!allowed.includes(preset)) return NextResponse.json({error:'Invalid range'}, {status:400});
    const todayUTC = Date.parse(`${currentDay}T00:00:00Z`);
    const presetStart = new Date(todayUTC-(Number(preset || 30)-1)*86400000).toISOString().slice(0,10);
    const from = preset==='custom' ? request.nextUrl.searchParams.get('from') || '' : presetStart;
    const to = preset==='custom' ? request.nextUrl.searchParams.get('to') || '' : currentDay;
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(from) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(to) || to > currentDay) return NextResponse.json({error:'Invalid date range'}, {status:400});
    let days: string[];
    try { days = hongKongDaysInRange(from,to); } catch {return NextResponse.json({error:'日期範圍最多 366 日，並須由早至晚。'}, {status:400});}
    const startIso = new Date(`${days[0]}T00:00:00+08:00`).toISOString();
    const endExclusiveIso = new Date(Date.parse(`${to}T00:00:00+08:00`) + 86400000).toISOString();
    let analytics: Awaited<ReturnType<typeof getSiteAnalyticsSummary>> | null = null;
    let analyticsError: string | null = null;
    try {
      analytics = await getSiteAnalyticsSummary(db, startIso, endExclusiveIso);
    } catch (error) {
      analyticsError = error instanceof Error ? error.message : "Analytics 暫時無法讀取";
      console.error("Growth Dashboard analytics unavailable:", analyticsError);
    }

    const model = buildGrowthDashboard(
      events, merchants, accounts, adminRows,
      analytics?.trend.map(d => ({ date: d.date, pageViews: d.pageViews })) || [],
      unreadCount,
      new Date(),
      days,
    );
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      period: `${from} 至 ${to}（香港時間）`,
      reportRange: { from, to, days: days.length },
      ...model,
      analytics: analytics
        ? {
            available: true,
            consentedOnly: true,
            totals: analytics.totals,
            topPages: analytics.topPages,
            topEvents: analytics.topEvents,
            devices: analytics.devices,
            referrers: analytics.referrers,
          }
        : { available: false, consentedOnly: true, error: analyticsError },
    }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    // Authentication succeeded, but incomplete data is never presented as zero.
    console.error("Growth Dashboard data load failed", error);
    return NextResponse.json({
      error: "營運統計資料讀取失敗，請稍後重試；系統不會以 0 代替缺失數據。",
    }, { status: 503 });
  }
}

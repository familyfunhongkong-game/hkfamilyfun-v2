import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CountResult = { count: number | null; error: { message?: string } | null };

async function safeCount(
  client: SupabaseClient<any>,
  table: string,
  filters: Array<[string, string]> = [],
): Promise<{ count: number; available: boolean; error?: string }> {
  let query = client.from(table).select("*", { count: "exact", head: true });

  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }

  const result = (await query) as CountResult;

  if (result.error) {
    return {
      count: 0,
      available: false,
      error: result.error.message || "unavailable",
    };
  }

  return { count: result.count || 0, available: true };
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!url || !anon || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");

  if (isAdmin !== true) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const [
    totalEvents,
    submittedEvents,
    draftEvents,
    publishedEvents,
    merchants,
    pendingMerchants,
    unreadNotifications,
    contentDrafts,
    publishedArticles,
    activeBanners,
    socialDrafts,
    intakeNew,
    dataSources,
    syncRuns,
    integrations,
  ] = await Promise.all([
    safeCount(client, "events"),
    safeCount(client, "events", [["status", "submitted"]]),
    safeCount(client, "events", [["status", "draft"]]),
    safeCount(client, "events", [["status", "published"]]),
    safeCount(client, "merchants"),
    safeCount(client, "merchants", [["status", "pending"]]),
    safeCount(client, "platform_notifications", [["recipient_scope", "admin"]]),
    safeCount(client, "content_articles", [["status", "draft"]]),
    safeCount(client, "content_articles", [["status", "published"]]),
    safeCount(client, "promo_banners", [["status", "active"]]),
    safeCount(client, "social_content_drafts", [["status", "draft"]]),
    safeCount(client, "intake_submissions", [["status", "new"]]),
    safeCount(client, "external_data_sources", [["active", "true"]]),
    safeCount(client, "data_sync_runs"),
    safeCount(client, "admin_integrations"),
  ]);

  let unreadExact = unreadNotifications;
  if (unreadNotifications.available) {
    const unread = await client
      .from("platform_notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_scope", "admin")
      .is("read_at", null);

    unreadExact = unread.error
      ? unreadNotifications
      : { count: unread.count || 0, available: true };
  }

  let latestSync: Record<string, unknown> | null = null;
  const latestSyncResponse = await client
    .from("data_sync_runs")
    .select(
      "id,status,rows_read,rows_inserted,rows_updated,rows_skipped,error_count,message,started_at,finished_at",
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestSyncResponse.error && latestSyncResponse.data) {
    latestSync = latestSyncResponse.data as Record<string, unknown>;
  }

  let sources: Record<string, unknown>[] = [];
  const sourceResponse = await client
    .from("external_data_sources")
    .select(
      "id,source_key,source_type,display_name,source_url,sheet_name,active,sync_mode,last_sync_at,last_sync_status,last_sync_message",
    )
    .order("display_name", { ascending: true })
    .limit(50);

  if (!sourceResponse.error) {
    sources = (sourceResponse.data || []) as Record<string, unknown>[];
  }

  const newOpsTablesAvailable =
    contentDrafts.available &&
    activeBanners.available &&
    socialDrafts.available &&
    intakeNew.available &&
    dataSources.available;

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    newOpsTablesAvailable,
    metrics: {
      totalEvents,
      submittedEvents,
      draftEvents,
      publishedEvents,
      merchants,
      pendingMerchants,
      unreadNotifications: unreadExact,
      contentDrafts,
      publishedArticles,
      activeBanners,
      socialDrafts,
      intakeNew,
      dataSources,
      syncRuns,
      integrations,
    },
    latestSync,
    sources,
  });
}

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  decryptAdminGoogleToken,
  getGoogleServiceAccountAccessToken,
  isGoogleServiceAccountConfigured,
  refreshGoogleAccessToken,
} from "@/lib/admin-google-drive";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  source_key: string;
  source_type: string;
  display_name: string;
  sheet_id: string | null;
  sheet_name: string | null;
};

function rowObject(headers: unknown[], values: unknown[]) {
  const payload: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    const key = String(header || "").trim() || "column_" + (index + 1);
    payload[key] = values[index] ?? "";
  });
  return payload;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const serviceAccountMode = isGoogleServiceAccountConfigured();
  const { data: integration, error: integrationError } = serviceAccountMode
    ? { data: null, error: null }
    : await admin.client
        .from("admin_integrations")
        .select("encrypted_refresh_token,status")
        .eq("provider", "google_drive")
        .maybeSingle();

  if (!serviceAccountMode && (integrationError || integration?.status !== "connected")) {
    return NextResponse.json({ error: "Google Drive 尚未連接。" }, { status: 409 });
  }

  let accessToken = "";
  try {
    if (serviceAccountMode) {
      accessToken = await getGoogleServiceAccountAccessToken();
    } else {
      const refreshToken = decryptAdminGoogleToken(integration?.encrypted_refresh_token);
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Google Drive refresh token 無效，請重新連接。" },
          { status: 409 },
        );
      }
      accessToken = await refreshGoogleAccessToken(refreshToken);
    }
  } catch {
    return NextResponse.json(
      {
        error: serviceAccountMode
          ? "Google Service Account 授權失敗，請檢查 service account 設定及 Sheet 分享權限。"
          : "Google Drive token refresh 失敗，請重新連接。",
      },
      { status: 502 },
    );
  }

  const { data: sourceData, error: sourceError } = await admin.client
    .from("external_data_sources")
    .select("id,source_key,source_type,display_name,sheet_id,sheet_name")
    .eq("active", true)
    .eq("source_type", "google_sheet")
    .order("display_name");

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  const sources = (sourceData || []) as SourceRow[];
  let rowsRead = 0;
  let rowsUpserted = 0;
  let errors = 0;
  const sourceResults: Array<Record<string, unknown>> = [];

  for (const source of sources) {
    if (source.source_key === "drive_event_source_registry") {
      sourceResults.push({
        source: source.display_name,
        status: "success",
        rows_read: 0,
        rows_upserted: 0,
        errors: 0,
        message: "Source registry is reserved for discovery automation and is not imported as event submissions.",
      });
      continue;
    }

    const startedAt = new Date().toISOString();
    const { data: run } = await admin.client
      .from("data_sync_runs")
      .insert({ source_id: source.id, status: "running", started_at: startedAt })
      .select("id")
      .single();

    let sourceRead = 0;
    let sourceUpserted = 0;
    let sourceErrors = 0;
    let status: "success" | "partial" | "failed" = "success";
    let message = "Synced successfully";

    try {
      if (!source.sheet_id) throw new Error("Missing sheet_id");

      const range = (source.sheet_name || "Sheet1") + "!A:ZZ";
      const url =
        "https://sheets.googleapis.com/v4/spreadsheets/" +
        encodeURIComponent(source.sheet_id) +
        "/values/" +
        encodeURIComponent(range) +
        "?majorDimension=ROWS";

      const response = await fetch(url, {
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Google Sheets API " + response.status);
      }

      const body = (await response.json()) as { values?: unknown[][] };
      const rows = body.values || [];
      const headers = rows[0] || [];
      const dataRows = rows.slice(1).filter((row) =>
        row.some((value) => String(value || "").trim().length > 0),
      );

      sourceRead = dataRows.length;
      rowsRead += sourceRead;

      for (let index = 0; index < dataRows.length; index += 1) {
        const payload = rowObject(headers, dataRows[index] || []);
        const externalKey = "row:" + String(index + 2);
        const payloadHash = crypto
          .createHash("sha256")
          .update(JSON.stringify(payload))
          .digest("hex");

        const { error } = await admin.client.from("intake_submissions").upsert(
          {
            source_id: source.id,
            source_type: "google_sheet",
            external_key: externalKey,
            submission_type: "event",
            status: "new",
            payload,
            normalized_payload: {
              source_key: source.source_key,
              source_name: source.display_name,
              payload_hash: payloadHash,
              sheet_row: index + 2,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "source_id,external_key" },
        );

        if (error) {
          sourceErrors += 1;
          errors += 1;
        } else {
          sourceUpserted += 1;
          rowsUpserted += 1;
        }
      }

      if (sourceErrors > 0) {
        status = sourceUpserted > 0 ? "partial" : "failed";
        message = sourceErrors + " row(s) failed";
      }
    } catch (error) {
      status = "failed";
      sourceErrors += 1;
      errors += 1;
      message = error instanceof Error ? error.message : "Unknown sync error";
    }

    const finishedAt = new Date().toISOString();

    if (run?.id) {
      await admin.client
        .from("data_sync_runs")
        .update({
          status,
          rows_read: sourceRead,
          rows_inserted: sourceUpserted,
          error_count: sourceErrors,
          message,
          finished_at: finishedAt,
        })
        .eq("id", run.id);
    }

    await admin.client
      .from("external_data_sources")
      .update({
        last_sync_at: finishedAt,
        last_sync_status: status,
        last_sync_message: message,
        updated_at: finishedAt,
      })
      .eq("id", source.id);

    sourceResults.push({
      source: source.display_name,
      status,
      rows_read: sourceRead,
      rows_upserted: sourceUpserted,
      errors: sourceErrors,
    });
  }

  if (!serviceAccountMode) {
    await admin.client
      .from("admin_integrations")
      .update({
        last_used_at: new Date().toISOString(),
        last_error: errors > 0 ? errors + " sync error(s)" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "google_drive");
  }

  return NextResponse.json({
    ok: errors === 0,
    sources: sourceResults,
    rows_read: rowsRead,
    rows_upserted: rowsUpserted,
    errors,
    auth_mode: serviceAccountMode ? "service_account" : "oauth",
  });
}

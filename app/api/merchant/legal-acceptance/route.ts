import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CURRENT_MERCHANT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/merchant-legal";

export const runtime = "nodejs";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const adminKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!supabaseUrl || !publishableKey || !adminKey) {
    return response({ error: "Merchant legal acceptance service is unavailable." }, 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) return response({ error: "Unauthorized" }, 401);

  let body: {
    accepted?: boolean;
    terms_version?: string;
  };

  try {
    body = (await request.json()) as {
      accepted?: boolean;
      terms_version?: string;
    };
  } catch {
    return response({ error: "Invalid request body." }, 400);
  }

  if (
    body.accepted !== true ||
    body.terms_version !== CURRENT_MERCHANT_TERMS_VERSION
  ) {
    return response(
      { error: "請先閱讀並同意目前版本的 Merchant Terms。" },
      400,
    );
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } =
    await userClient.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return response({ error: "Unauthorized" }, 401);
  }

  const { data: merchant, error: merchantError } = await userClient
    .from("merchants")
    .select(
      "id,owner_user_id,status,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at",
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (
    merchantError ||
    !merchant ||
    merchant.owner_user_id !== user.id
  ) {
    return response({ error: "Merchant account not found." }, 404);
  }

  if (
    !merchant.privacy_accepted_at ||
    merchant.privacy_version !== CURRENT_PRIVACY_VERSION
  ) {
    return response(
      {
        error:
          "目前商戶 Privacy acceptance 記錄不完整，請聯絡 HK Family Fun 處理。",
      },
      409,
    );
  }

  if (
    merchant.terms_version === CURRENT_MERCHANT_TERMS_VERSION &&
    merchant.terms_accepted_at
  ) {
    return response({
      accepted: true,
      already_current: true,
      terms_version: CURRENT_MERCHANT_TERMS_VERSION,
      terms_accepted_at: merchant.terms_accepted_at,
    });
  }

  const adminClient = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const acceptedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await adminClient
    .from("merchants")
    .update({
      terms_version: CURRENT_MERCHANT_TERMS_VERSION,
      terms_accepted_at: acceptedAt,
      updated_at: acceptedAt,
    })
    .eq("id", merchant.id)
    .eq("owner_user_id", user.id)
    .select("id,terms_version,terms_accepted_at")
    .single();

  if (updateError || !updated) {
    console.error("merchant terms reacceptance failed", {
      merchantId: merchant.id,
      userId: user.id,
      error: updateError?.message || "No updated row",
    });
    return response(
      { error: "暫時未能儲存新版 Merchant Terms 接受記錄。" },
      500,
    );
  }

  return response({
    accepted: true,
    already_current: false,
    terms_version: updated.terms_version,
    terms_accepted_at: updated.terms_accepted_at,
  });
}

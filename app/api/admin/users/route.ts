import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";

type AdminRole = "admin" | "super_admin";
type AdminStatus = "active" | "disabled";

function bearerToken(request: NextRequest) {
  return (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function activeSuperAdminCount(client: NonNullable<ReturnType<typeof serviceClient>>) {
  const { count, error } = await client
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) throw error;
  return count || 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(bearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ error: "Admin service 未設定。" }, { status: 503 });
  }

  const { data, error } = await service
    .from("admin_users")
    .select("id,user_id,email,role,status,invited_at,created_at,updated_at,last_role_changed_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    currentUserId: auth.user.id,
    users: data || [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(bearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ error: "Admin service 未設定。" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const role: AdminRole = body.role === "super_admin" ? "super_admin" : "admin";

  if (!validEmail(email)) {
    return NextResponse.json({ error: "請輸入有效電郵地址。" }, { status: 400 });
  }

  const { data: existingAdmin, error: existingAdminError } = await service
    .from("admin_users")
    .select("id,user_id,email,role,status")
    .eq("email", email)
    .maybeSingle();

  if (existingAdminError) {
    return NextResponse.json({ error: existingAdminError.message }, { status: 500 });
  }

  let userId = existingAdmin?.user_id || null;
  let invitationSent = false;

  if (!userId) {
    const { data: listed, error: listError } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const existingAuthUser = listed.users.find(
      (user) => normalizeEmail(user.email) === email,
    );

    userId = existingAuthUser?.id || null;
  }

  if (!userId) {
    const baseUrl =
      String(process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
      String(process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
      request.nextUrl.origin;
    const redirectTo =
      baseUrl.replace(/\/$/, "") + "/merchant/update-password?return=admin";

    const { data: inviteData, error: inviteError } =
      await service.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    userId = inviteData.user?.id || null;
    invitationSent = true;
  }

  const now = new Date().toISOString();

  if (existingAdmin) {
    const { error: updateError } = await service
      .from("admin_users")
      .update({
        user_id: userId,
        role,
        status: "active",
        invited_by: auth.user.id,
        invited_at: now,
        last_role_changed_by: auth.user.id,
        last_role_changed_at: now,
        updated_at: now,
      })
      .eq("id", existingAdmin.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await service.from("admin_users").insert({
      user_id: userId,
      email,
      role,
      status: "active",
      invited_by: auth.user.id,
      invited_at: now,
      last_role_changed_by: auth.user.id,
      last_role_changed_at: now,
      updated_at: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    invitationSent,
    message: invitationSent
      ? "Admin invitation 已寄出。"
      : "此電郵已有帳戶，Admin 權限已啟用。",
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(bearerToken(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ error: "Admin service 未設定。" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const requestedRole =
    body.role === "super_admin" || body.role === "admin"
      ? (body.role as AdminRole)
      : null;
  const requestedStatus =
    body.status === "active" || body.status === "disabled"
      ? (body.status as AdminStatus)
      : null;

  if (!id || (!requestedRole && !requestedStatus)) {
    return NextResponse.json({ error: "缺少要更新嘅 Admin 資料。" }, { status: 400 });
  }

  const { data: target, error: targetError } = await service
    .from("admin_users")
    .select("id,user_id,email,role,status")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "搵唔到呢個 Admin。" }, { status: 404 });
  }

  const removingActiveSuper =
    target.role === "super_admin" &&
    target.status === "active" &&
    ((requestedRole && requestedRole !== "super_admin") ||
      requestedStatus === "disabled");

  if (removingActiveSuper) {
    const superCount = await activeSuperAdminCount(service);
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "最後一個 Active Super Admin 不可降級或停用。" },
        { status: 409 },
      );
    }
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    updated_at: now,
    last_role_changed_by: auth.user.id,
    last_role_changed_at: now,
  };

  if (requestedRole) payload.role = requestedRole;
  if (requestedStatus) payload.status = requestedStatus;

  const { error: updateError } = await service
    .from("admin_users")
    .update(payload)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

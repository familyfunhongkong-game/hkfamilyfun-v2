import { createClient } from "@supabase/supabase-js";

export function runtimeSupabaseConfig() {
  return {
    url: String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
    anon:
      String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim() ||
      String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
    service:
      String(process.env.SUPABASE_SERVICE_KEY || "").trim() ||
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  };
}

export async function requireAdmin(accessToken: string) {
  const config = runtimeSupabaseConfig();

  if (!config.url || !config.anon || !accessToken) {
    return { ok: false as const, status: 401, error: "Unauthorized", client: null };
  }

  const client = createClient(config.url, config.anon, {
    global: { headers: { Authorization: "Bearer " + accessToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { ok: false as const, status: 401, error: "Unauthorized", client: null };
  }

  const { data: isAdmin, error: adminError } = await client.rpc("is_platform_admin");

  if (adminError || isAdmin !== true) {
    return { ok: false as const, status: 403, error: "Admin access required", client: null };
  }

  return {
    ok: true as const,
    status: 200,
    error: "",
    client,
    user: userData.user,
    config,
  };
}

export function serviceClient() {
  const config = runtimeSupabaseConfig();

  if (!config.url || !config.service) {
    return null;
  }

  return createClient(config.url, config.service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

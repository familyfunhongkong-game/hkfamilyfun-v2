import { createClient } from "@supabase/supabase-js";

/**
 * Public catalogue reads must always use the anonymous database role,
 * even when a parent or merchant has an active login in a different tab.
 *
 * No session is stored, no tokens are refreshed, and OAuth callbacks are
 * not processed by this client. Keep private event CRUD on the normal
 * authenticated client in lib/supabase/client.ts.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

export const publicSupabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

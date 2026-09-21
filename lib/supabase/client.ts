import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseKey
);

function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Supabase client initialization failed:", error);
    return null;
  }
}

export const supabase = createSupabaseBrowserClient();
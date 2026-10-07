export const HK_FAMILY_FUN_SUPABASE_PROJECT_REF =
  "uiyrbqqvgnfhfdhedmav";

export function supabaseProjectRefFromUrl(value: string | undefined | null) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const suffix = ".supabase.co";

    if (!hostname.endsWith(suffix)) return null;

    const ref = hostname.slice(0, -suffix.length);
    return /^[a-z0-9]+$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

export function isFamilyFunSupabaseUrl(value: string | undefined | null) {
  return (
    supabaseProjectRefFromUrl(value) === HK_FAMILY_FUN_SUPABASE_PROJECT_REF
  );
}

type ProviderSettings = { external?: { google?: boolean } };

/**
 * Check the live Supabase Auth provider config before opening a new OAuth window.
 * Do not redirect users to the raw GoTrue "unsupported provider" JSON error page.
 */
export async function googleSignInAvailability(): Promise<"enabled" | "disabled" | "unavailable"> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return "unavailable";

  try {
    const response = await fetch(base + "/auth/v1/settings", {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!response.ok) return "unavailable";
    const settings = (await response.json()) as ProviderSettings;
    if (settings.external?.google === true) return "enabled";
    if (settings.external?.google === false) return "disabled";
  } catch {
    // Network problem: do not open an OAuth page that may display a raw JSON error.
  }

  return "unavailable";
}

type Provider = "google" | "facebook";
type ProviderSettings = { external?: Partial<Record<Provider, boolean>> };
type Availability = "enabled" | "disabled" | "unavailable";

/**
 * Public Supabase Auth settings describe which providers are available.
 * Query the live configuration before OAuth to avoid sending visitors to a
 * raw GoTrue error when a provider hasn't been enabled.
 *
 * This check doesn't replace OAuth end-to-end verification, especially when
 * a provider has been toggled on without its client ID and secret.
 */
export async function socialSignInAvailability(provider: Provider): Promise<Availability> {
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
    const enabled = settings.external?.[provider];
    if (enabled === true) return "enabled";
    if (enabled === false) return "disabled";
  } catch {
    // Network failures are shown as a localized message by the caller.
  }
  return "unavailable";
}

export async function googleSignInAvailability(): Promise<Availability> {
  return socialSignInAvailability("google");
}

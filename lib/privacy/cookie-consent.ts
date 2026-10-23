/** Public, versioned first-party preferences.  The cookie holds NO visitor identifier. */
export const CONSENT_COOKIE = "hkff_cookie_preferences";
export const CONSENT_VERSION = "v1";
export const ANALYTICS_CONSENT = "v1_analytics";
export const ESSENTIAL_CONSENT = "v1_essential";
export const CONSENT_EVENT = "hkff:consent-changed";
// A privacy-preserving backup stores only essential-only when browser cookies are unavailable.
export const CONSENT_ESSENTIAL_BACKUP = "hkff_cookie_essential_backup";

export type ConsentChoice = "analytics" | "essential" | null;

export function readConsent(): ConsentChoice {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split(";").map(p => p.trim())
    .find(p => p.startsWith(CONSENT_COOKIE + "="))?.slice(CONSENT_COOKIE.length + 1);
  if (raw === ANALYTICS_CONSENT) return "analytics";
  if (raw === ESSENTIAL_CONSENT) return "essential";
  try {
    if (window.localStorage.getItem(CONSENT_ESSENTIAL_BACKUP) === ESSENTIAL_CONSENT) return "essential";
  } catch {
    // Some browsers disable cookies and localStorage at the same time.
  }
  return null;
}

export function clearAnalyticsIdentifiers() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("hkff_visitor_id");
    window.sessionStorage.removeItem("hkff_session_id");
  } catch {
    // Storage may be blocked in private browsing.
  }
}

export function saveConsent(choice: Exclude<ConsentChoice, null>) {
  if (typeof document === "undefined") return;
  const value = choice === "analytics" ? ANALYTICS_CONSENT : ESSENTIAL_CONSENT;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (choice === "essential") clearAnalyticsIdentifiers();
  document.cookie = CONSENT_COOKIE + "=" + value +
    "; Path=/; Max-Age=15552000; SameSite=Lax" + secure;
  // document.cookie can silently discard writes when browser storage is disabled.
  // A visible error is safer than closing the notice and claiming success.
  const cookieStored = document.cookie.split(";").some((item) => item.trim() === CONSENT_COOKIE + "=" + value);
  if (!cookieStored) {
    if (choice !== "essential" || !saveEssentialBackup()) {
      throw new Error("Browser did not store the cookie preference");
    }
  } else {
    try { window.localStorage.removeItem(CONSENT_ESSENTIAL_BACKUP); } catch { /* optional storage */ }
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * Essential-only fallback when the browser blocks first-party cookies.
 * Never store "analytics" here: optional tracking stays off without a valid cookie.
 */
export function saveEssentialBackup(): boolean {
  if (typeof window === "undefined") return false;
  clearAnalyticsIdentifiers();
  try {
    window.localStorage.setItem(CONSENT_ESSENTIAL_BACKUP, ESSENTIAL_CONSENT);
    return window.localStorage.getItem(CONSENT_ESSENTIAL_BACKUP) === ESSENTIAL_CONSENT;
  } catch {
    return false;
  }
}

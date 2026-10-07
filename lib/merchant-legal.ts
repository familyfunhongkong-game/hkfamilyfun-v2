export const CURRENT_MERCHANT_TERMS_VERSION = "2026-10-07";
export const CURRENT_PRIVACY_VERSION = "2026-09-28";

export type MerchantLegalSnapshot = {
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  privacy_version?: string | null;
  privacy_accepted_at?: string | null;
};

export function hasCurrentMerchantTerms(
  merchant: MerchantLegalSnapshot | null | undefined,
) {
  return (
    String(merchant?.terms_version || "").trim() ===
      CURRENT_MERCHANT_TERMS_VERSION &&
    Boolean(merchant?.terms_accepted_at)
  );
}

export function hasCurrentPrivacyAcceptance(
  merchant: MerchantLegalSnapshot | null | undefined,
) {
  return (
    String(merchant?.privacy_version || "").trim() === CURRENT_PRIVACY_VERSION &&
    Boolean(merchant?.privacy_accepted_at)
  );
}

const SELL_WITH_FAMILY_FUN_IMPLEMENTED = false;
const sellWithFamilyFunRequested =
  process.env.NEXT_PUBLIC_ENABLE_SELL_WITH_FAMILY_FUN === "true";

export const HK_FAMILY_FUN_BUSINESS_MODEL = {
  freeEventListing: true,
  paidAdvertising: true,
  sellWithFamilyFunImplemented: SELL_WITH_FAMILY_FUN_IMPLEMENTED,
  sellWithFamilyFunRequested,
  sellWithFamilyFunEnabled:
    SELL_WITH_FAMILY_FUN_IMPLEMENTED && sellWithFamilyFunRequested,
} as const;

export const HK_FAMILY_FUN_HOUSE_SPONSOR = "HK Family Fun";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isHousePromotion(sponsorName: unknown) {
  return normalized(sponsorName) === normalized(HK_FAMILY_FUN_HOUSE_SPONSOR);
}

export function canShowPromotion(input: {
  isPaid?: boolean | null;
  sponsorName?: string | null;
}) {
  return Boolean(input.isPaid) || isHousePromotion(input.sponsorName);
}

export function canActivatePromotion(input: {
  is_paid?: boolean | null;
  sponsor_name?: string | null;
}) {
  return canShowPromotion({
    isPaid: input.is_paid,
    sponsorName: input.sponsor_name,
  });
}

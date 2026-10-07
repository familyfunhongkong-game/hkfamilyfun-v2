import { isHousePromotion } from "@/lib/business-model";

export type PromotionCommercialStage =
  | "house"
  | "awaiting_payment"
  | "paid_pending_schedule"
  | "live"
  | "completed";

export type PromotionCommercialInput = {
  status: "draft" | "active" | "paused" | "archived";
  is_paid?: boolean | null;
  sponsor_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export const promotionCommercialStageLabels: Record<
  PromotionCommercialStage,
  string
> = {
  house: "HK Family Fun 自家宣傳",
  awaiting_payment: "待收款",
  paid_pending_schedule: "已付款待排期",
  live: "Live Sponsored",
  completed: "已完成",
};

function timestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function getPromotionCommercialStage(
  row: PromotionCommercialInput,
  now = Date.now(),
): PromotionCommercialStage {
  if (isHousePromotion(row.sponsor_name)) return "house";

  const startsAt = timestamp(row.starts_at);
  const endsAt = timestamp(row.ends_at);

  if (row.status === "archived" || (endsAt !== null && endsAt < now)) {
    return "completed";
  }

  if (!row.is_paid) return "awaiting_payment";

  const inWindow =
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt >= now);

  if (row.status === "active" && inWindow) return "live";

  return "paid_pending_schedule";
}

export function promotionCommercialStageDetail(
  stage: PromotionCommercialStage,
) {
  if (stage === "house") {
    return "平台自家宣傳，不計入商戶廣告收款。";
  }
  if (stage === "awaiting_payment") {
    return "商戶廣告尚未確認收款，前台不會顯示。";
  }
  if (stage === "paid_pending_schedule") {
    return "已確認收款，但尚未進入有效 Live 時段，或目前處於 Draft / Paused。";
  }
  if (stage === "live") {
    return "已確認收款、狀態 Active，而且目前在設定的投放時間內。";
  }
  return "已封存或投放結束。";
}

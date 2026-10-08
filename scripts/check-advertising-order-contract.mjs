import { readFile } from "node:fs/promises";

const files = {
  api: await readFile("app/api/merchant-advertising-enquiry/route.ts", "utf8"),
  form: await readFile("components/merchant-advertising-enquiry-form.tsx", "utf8"),
  admin: await readFile("app/admin/advertising/page.tsx", "utf8"),
  adminHome: await readFile("app/admin/page.tsx", "utf8"),
  promotions: await readFile("app/admin/promotions/page.tsx", "utf8"),
  health: await readFile("app/api/admin/system-health/route.ts", "utf8"),
  hkTime: await readFile("lib/hong-kong-datetime.ts", "utf8"),
  commerce: await readFile("docs/COMMERCE_RULES.md", "utf8"),
  migration: await readFile(
    "supabase/migrations/20261008175448_add_merchant_advertising_orders.sql",
    "utf8",
  ),
  submitterIndex: await readFile(
    "supabase/migrations/20261008175628_index_merchant_advertising_order_submitter.sql",
    "utf8",
  ),
};

let failed = false;

function requireSignals(label, source, signals) {
  for (const signal of signals) {
    if (!source.includes(signal)) {
      console.error(`[advertising-orders] ${label} missing: ${signal}`);
      failed = true;
    }
  }
}

requireSignals("API durable save", files.api, [
  '.from("merchant_advertising_orders")',
  ".insert(orderPayload)",
  'insertResult.error.code === "23505"',
  "advertising-enquiry persistence failed",
  "notification_warning",
  "saved: true",
]);

const insertPosition = files.api.indexOf(".insert(orderPayload)");
const adminEmailPosition = files.api.indexOf("const adminResult = await sendMail");
if (insertPosition < 0 || adminEmailPosition < 0 || insertPosition > adminEmailPosition) {
  console.error("[advertising-orders] enquiry must be persisted before admin email is attempted");
  failed = true;
}

if (files.api.includes('error: "Unable to submit advertising enquiry."')) {
  console.error("[advertising-orders] email failure must not convert a durable saved enquiry into a failed submission");
  failed = true;
}

requireSignals("Merchant history", files.form, [
  '.from("merchant_advertising_orders")',
  "廣告查詢紀錄",
  "paymentStatusLabel",
  "付款狀態由 HK Family Fun Admin 確認",
]);

requireSignals("Admin CRM", files.admin, [
  "廣告查詢・報價・付款・排期",
  '.from("merchant_advertising_orders")',
  'editor.payment_status !== "paid"',
  'editor.status === "live" && !editor.promo_banner_id',
  "Payment 必須由 Admin 確認",
  ".update(payload)",
  "bannerPayload.is_paid = true",
  'bannerPayload.status = "active"',
  'bannerPayload.status = "paused"',
  "hongKongDatetimeLocalToIso",
  "isoToHongKongDatetimeLocal",
]);

requireSignals("Admin navigation", files.adminHome, [
  'href: "/admin/advertising"',
  'title: "Advertising CRM"',
]);

requireSignals("Promotion navigation", files.promotions, [
  'href="/admin/advertising"',
  "廣告查詢 / 報價 / 付款 CRM",
]);

requireSignals("Hong Kong scheduling", files.hkTime, [
  'HONG_KONG_UTC_OFFSET = "+08:00"',
  "Asia/Hong_Kong",
  "hongKongDatetimeLocalToIso",
  "isoToHongKongDatetimeLocal",
]);

requireSignals("Promotion timezone", files.promotions, [
  "hongKongDatetimeLocalToIso",
  "isoToHongKongDatetimeLocal",
  "formatHongKongDateTime",
]);

requireSignals("System Health", files.health, [
  '.from("merchant_advertising_orders")',
  "Merchant Advertising CRM",
  "advertisingOrdersProbe.error",
]);

requireSignals("Database RLS", files.migration, [
  "alter table public.merchant_advertising_orders enable row level security",
  'create policy "Merchant owners can view own advertising orders"',
  'create policy "Approved merchants can create advertising enquiries"',
  'create policy "Platform admin can manage advertising orders"',
  "request_id uuid not null unique",
  "payment_status <> 'paid'",
  "m.status = 'approved'",
]);

requireSignals("Submitter index", files.submitterIndex, [
  "merchant_advertising_orders_submitted_by_idx",
  "(submitted_by)",
]);

requireSignals("Commerce rules", files.commerce, [
  "written to `merchant_advertising_orders` before any email is attempted",
  "A merchant cannot mark an order paid",
  "Free",
  "Normal event listing must never require a promotion payment",
]);

if (failed) process.exit(1);

console.log(
  "[advertising-orders] OK — durable save, merchant ownership, Admin payment control and free-listing separation are enforced.",
);

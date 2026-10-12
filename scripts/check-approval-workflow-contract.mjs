import { readFile } from "node:fs/promises";

const admin = await readFile("app/admin/events/[id]/page.tsx", "utf8");
const merchant = await readFile("app/merchant/events/[id]/edit/page.tsx", "utf8");
const rls = await readFile(
  "supabase/migrations/20260917114602_harden_hk_family_fun_rls.sql",
  "utf8",
);

const requiredAdminSignals = [
  'safeText(event.status).toLowerCase() === "approved"',
  'updateEventStatus("published")',
  'updateEventStatus("approved")',
  '批准・待發布',
  '正式發布',
];

const requiredMerchantSignals = [
  'merchantCanEdit(eventRecord?.status)',
  'saveEvent("submitted")',
  'Admin 請使用活動審批中心控制審批狀態',
];

const requiredRlsSignals = [
  "Only draft or rejected events can be edited by merchant",
  "Merchant can only keep event as draft or submit it for review",
  "new.status not in ('draft', 'submitted')",
];

let failed = false;

for (const signal of requiredAdminSignals) {
  if (!admin.includes(signal)) {
    console.error(`[approval-workflow] Admin workflow missing: ${signal}`);
    failed = true;
  }
}

const approvedGate = admin.indexOf('safeText(event.status).toLowerCase() === "approved"');
const publishAction = admin.indexOf('updateEventStatus("published")', approvedGate);
if (approvedGate < 0 || publishAction < approvedGate) {
  console.error("[approval-workflow] publish action must remain inside approved-state UI gate");
  failed = true;
}

for (const signal of requiredMerchantSignals) {
  if (!merchant.includes(signal)) {
    console.error(`[approval-workflow] Merchant workflow missing: ${signal}`);
    failed = true;
  }
}

for (const signal of requiredRlsSignals) {
  if (!rls.includes(signal)) {
    console.error(`[approval-workflow] RLS/trigger guard missing: ${signal}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  "[approval-workflow] OK — Merchant can only submit; Admin UI requires approved state before publish.",
);

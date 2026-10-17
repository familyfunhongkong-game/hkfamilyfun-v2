// Daily review reminder. Uses unread notifications, not an approval workflow status.
// Requires server-only credentials provided via GitHub Actions Secrets.
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "DIGEST_FROM_EMAIL"];
for (const key of required) {
  if (!process.env[key]) throw new Error("Missing GitHub Actions secret: " + key);
}
const destination = "familyfun.hongkong@gmail.com";
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
};
const response = await fetch(base + "/rest/v1/platform_notifications?recipient_scope=eq.admin&read_at=is.null&select=id,title,kind,message,created_at,event_id,merchant_id&order=created_at.asc&limit=1000", { headers });
if (!response.ok) throw new Error("Supabase notifications failed: " + response.status + " " + (await response.text()).slice(0,300));
const records = await response.json();
const hkDate = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Hong_Kong", year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const items = records.slice(0, 100).map((r) => {
  const link = r.event_id
    ? "https://www.hkfamilyfun.com/admin/events/" + encodeURIComponent(r.event_id)
    : r.merchant_id ? "https://www.hkfamilyfun.com/admin/merchants" : "https://www.hkfamilyfun.com/admin/notifications";
  return '<li style="margin-bottom:12px"><b>' + htmlEscape(r.title) + '</b> <span style="color:#6b7280">(' + htmlEscape(r.kind) + ')</span><br/><small>' +
    htmlEscape(new Intl.DateTimeFormat("zh-HK",{timeZone:"Asia/Hong_Kong",dateStyle:"medium",timeStyle:"short"}).format(new Date(r.created_at))) +
    '</small> · <a href="' + link + '">查看詳情</a></li>';
}).join("");
const subject = "[HK Family Fun] " + hkDate + " 每日待核對通知：" + records.length + " 項";
const html = '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033">' +
  '<h2>HK Family Fun 每日待核對摘要</h2><p>香港日期：' + htmlEscape(hkDate) + '</p>' +
  '<p><strong>未讀通知：' + records.length + ' 項</strong></p>' +
  '<p>以下是系統尚未標記已讀的通知，不代表全部仍待審批。請到管理後台核實處理狀態及實際截止日期。</p>' +
  (records.length ? '<ol>' + items + '</ol>' : '<p>目前沒有未讀通知。</p>') +
  (records.length > 100 ? '<p>僅列出首 100 項，其餘請在後台查看。</p>' : '') +
  (records.length === 1000 ? '<p>可能超過 1000 項未讀通知，請到後台核對總數。</p>' : '') +
  '<p><a href="https://www.hkfamilyfun.com/admin/notifications">開啟通知中心</a></p>' +
  '<hr/><small>此摘要只寄送至指定管理員電郵，不包含用戶私人資料。</small></div>';
const send = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {"Authorization":"Bearer " + process.env.RESEND_API_KEY,"Content-Type":"application/json"},
  body: JSON.stringify({from: process.env.DIGEST_FROM_EMAIL,to:[destination],subject,html}),
});
if (!send.ok) throw new Error("Resend failed: " + send.status + " " + (await send.text()).slice(0,500));
const body = await send.json();
console.log("Daily digest accepted by Resend. Message ID:",body.id,"Unread records:",records.length);

type EmailDetail = { label: string; value: string };
type MerchantEmailOptions = {
  heading: string;
  intro: string;
  details: EmailDetail[];
  actionLabel: string;
  actionUrl: string;
  note: string;
};

// All merchant-submitted values are escaped before they enter an HTML email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function merchantNotificationEmailHtml({
  heading,
  intro,
  details,
  actionLabel,
  actionUrl,
  note,
}: MerchantEmailOptions): string {
  const link = new URL(actionUrl);
  if (link.protocol !== "https:" && !(link.protocol === "http:" && link.hostname === "localhost")) {
    throw new Error("Merchant email links must use HTTPS.");
  }
  const detailRows = details
    .filter(({ value }) => value.trim())
    .map(({ label, value }) =>
      `<tr><td style="padding:7px 0;color:#64748b;font-size:14px;vertical-align:top;width:115px;">${escapeHtml(label)}</td><td style="padding:7px 0;color:#1f2937;font-size:14px;font-weight:600;word-break:break-word;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HK Family Fun</title></head>
<body style="margin:0;padding:0;background:#f7f7f9;color:#263044;font-family:Arial,'Microsoft JhengHei',sans-serif;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background:#f7f7f9;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td align="center" bgcolor="#9333ea" style="padding:30px 18px;background:#9333ea;">
  <div style="color:#fff;font-size:26px;font-weight:bold;">HK Family Fun 🎉</div>
  <div style="margin-top:8px;color:#fff;font-size:14px;">Play More. Plan Less. ✨</div>
</td></tr>
<tr><td style="padding:34px 28px;">
  <h1 style="margin:0 0 18px;color:#1f2937;font-size:23px;line-height:1.4;">${escapeHtml(heading)}</h1>
  <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.8;">${escapeHtml(intro)}</p>
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 25px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${detailRows}</table>
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 24px;"><tr><td align="center" bgcolor="#9333ea" style="border-radius:10px;background:#9333ea;">
    <a href="${escapeHtml(link.toString())}" style="display:inline-block;padding:15px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:bold;">${escapeHtml(actionLabel)}</a>
  </td></tr></table>
  <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.7;">${escapeHtml(note)}</p>
  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.7;overflow-wrap:anywhere;word-break:break-all;">如果按鈕未能開啟，請複製呢個網址：<a href="${escapeHtml(link.toString())}" style="color:#9333ea;">${escapeHtml(link.toString())}</a></p>
</td></tr>
<tr><td align="center" bgcolor="#f9fafb" style="padding:22px;border-top:1px solid #eee;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.7;">
呢封係 HK Family Fun 商戶服務通知。請勿直接回覆系統發信地址。<br>
<a href="https://www.hkfamilyfun.com" style="color:#9333ea;text-decoration:none;">www.hkfamilyfun.com</a> · © 2026 HK Family Fun
</td></tr></table>
</td></tr></table></body></html>`;
}

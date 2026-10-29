// HK Family Fun daily pending-work digest. Reads actual approval status, not read_at.
// No credentials are placed in client code. Sending requires verified Resend sender.
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "DIGEST_FROM_EMAIL"];
for (const key of required) if (!process.env[key]) throw Error("Missing GitHub Actions secret: " + key);
const recipient = "familyfun.hongkong@gmail.com";
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY };
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Hong_Kong", year:"numeric",month:"2-digit",day:"2-digit" }).formatToParts(new Date()).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
const todayStart = Date.parse(today + "T00:00:00+08:00");
const day = 86400000;
const get = async (table, query) => {
  const res = await fetch(base + "/rest/v1/" + table + "?" + query, {headers});
  if (!res.ok) throw Error(table + " query failed (" + res.status + "): " + (await res.text()).slice(0,200));
  return res.json();
};
const [merchants, events, unread] = await Promise.all([
  get("merchants", "status=eq.pending&select=id,business_name,created_at&order=created_at.asc&limit=1000"),
  get("events", "status=in.(submitted,approved)&select=id,title,title_tc,created_at,status,start_date,end_date&order=created_at.asc&limit=1000"),
  get("platform_notifications", "recipient_scope=eq.admin&read_at=is.null&select=id,kind,title,created_at&order=created_at.asc&limit=1000")
]);
// Approved events stay actionable through their end date; submitted events always need review.
const actionableEvents = events.filter(x => x.status === "submitted" || !((x.end_date || x.start_date) && (x.end_date || x.start_date) < today));
const entries = [
  ...merchants.map(x => ({id:x.id, type:"商戶待審批", title:x.business_name || "未命名商戶", at:x.created_at, href:"/admin/merchants"})),
  ...actionableEvents.map(x => ({id:x.id,type:x.status==="submitted"?"活動待審批":"已批准待發布",title:x.title_tc || x.title || "未命名活動",at:x.created_at,href:"/admin/events/" + encodeURIComponent(x.id),start:x.start_date}))
].sort((a,b) => Date.parse(a.at) - Date.parse(b.at));
const age = (date) => Number.isFinite(Date.parse(date)) ? Math.max(0,Math.floor((todayStart-Date.parse(date))/day)) : null;
const items = entries.slice(0,100).map(x => {
  const elapsed=age(x.at);
  const color=elapsed!==null && elapsed>=5 ? "#b91c1c" : elapsed!==null && elapsed>=3 ? "#c2410c" : "#334155";
  return '<li style="padding:9px 0"><b>' + escapeHtml(x.type) + '：' + escapeHtml(x.title) +
    '</b> <span style="color:'+color+'">('+(elapsed===null?"日期待核對":"已等待 "+elapsed+" 日")+')</span>' +
    (x.start ? '<br/><small>活動開始：'+escapeHtml(x.start)+'</small>' : '') +
    '<br/><a href="https://www.hkfamilyfun.com'+x.href+'">前往處理</a></li>';
}).join("");
const subject="[HK Family Fun] "+today+" 待處理 "+entries.length+" 項｜未讀通知 "+unread.length+" 項";
const html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033">'+
'<h2>HK Family Fun｜每日待處理摘要</h2><p>香港日期：'+escapeHtml(today)+'</p>'+
'<p><strong>商戶待審批：'+merchants.length+'　活動待審批／待發布：'+actionableEvents.length+'　未讀通知：'+unread.length+'</strong></p>'+
'<p>此清單根據資料庫實際審批狀態，不會因為通知已讀而消失。按最早提交時間排列；標紅屬等待超過 5 日的跟進提示，並非已正式設定的截止日期。</p>'+
(entries.length?'<ol>'+items+'</ol>':'<p>目前沒有商戶或活動審批待辦。</p>')+
(entries.length>100?'<p>僅列出前 100 項；其餘請於後台查看。</p>':'')+
((merchants.length===1000||events.length===1000||unread.length===1000)?'<p>部分類別可能超過 1000 筆，請在後台核實總數。</p>':'')+
'<p><a href="https://www.hkfamilyfun.com/admin/notifications">通知中心</a>｜<a href="https://www.hkfamilyfun.com/admin/merchants">商戶審批</a>｜<a href="https://www.hkfamilyfun.com/admin/events">活動管理</a></p>'+
'<hr/><small>此郵件不包含商戶私人聯絡資料；請登入管理後台查看詳情。</small></div>';
if(process.env.DIGEST_DRY_RUN==="1"){ console.log(JSON.stringify({date:today,merchants:merchants.length,events:actionableEvents.length,unread:unread.length,previewSubject:subject}));process.exit(0);}
const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"hkfamilyfun-pending-digest-"+today},body:JSON.stringify({from:process.env.DIGEST_FROM_EMAIL,to:[recipient],subject,html})});
if(!result.ok)throw Error("Resend rejected email: "+result.status+" "+(await result.text()).slice(0,350));
const payload=await result.json();
if(!payload.id)throw Error("Resend gave no email ID.");
console.log("Digest accepted by Resend: "+payload.id+"; pending="+entries.length+"; unread="+unread.length);

import type { AppLocale } from "@/lib/i18n/config";
import type { ConsentChoice } from "@/lib/privacy/cookie-consent";

const words = {
  "zh-Hant": {
    eyebrow: "Cookies 設定中心",
    title: "選擇你的 Cookies 偏好",
    summary: "必要 Cookies 用於登入、保安和語言設定。流量分析是可選的，拒絕亦不影響活動搜尋及商戶登入。",
    essential: "必要 Cookies",
    essentialAbout: "身份驗證、保安、語言及記住你的選擇。不能關閉。",
    required: "必需",
    optional: "流量分析（可選）",
    optionalAbout: "同意後才會記錄瀏覽及活動互動統計；你可隨時撤回。",
    allow: "允許流量分析",
    reject: "只使用必要 Cookies",
    save: "儲存我的選擇",
    currentAnalytics: "目前選擇：已允許流量分析",
    currentEssential: "目前選擇：只使用必要 Cookies",
    currentNone: "尚未選擇",
    note: "按下按鈕後會儲存至你的瀏覽器，再返回此頁確認選擇。",
  },
  "zh-Hans": {
    eyebrow: "Cookies 设置中心",
    title: "选择你的 Cookies 偏好",
    summary: "必要 Cookies 用于登录、安全和语言设置。流量分析是可选的，拒绝后仍可搜索活动和登录商户账户。",
    essential: "必要 Cookies",
    essentialAbout: "身份验证、安全、语言和记住你的选择。无法关闭。",
    required: "必需",
    optional: "流量分析（可选）",
    optionalAbout: "同意后才会记录浏览与活动互动统计；可随时撤回。",
    allow: "允许流量分析",
    reject: "仅使用必要 Cookies",
    save: "保存我的选择",
    currentAnalytics: "当前选择：已允许流量分析",
    currentEssential: "当前选择：仅使用必要 Cookies",
    currentNone: "尚未选择",
    note: "点击按钮后，设置会保存在浏览器，并返回此页显示结果。",
  },
  en: {
    eyebrow: "Cookie preferences",
    title: "Manage your cookie choices",
    summary: "Essential cookies support sign-in, security and language settings. Analytics is optional; refusing does not prevent events or merchant sign-in.",
    essential: "Essential cookies",
    essentialAbout: "Required for authentication, security, language and remembering your preferences.",
    required: "Required",
    optional: "Analytics (optional)",
    optionalAbout: "Measure site and event use only after you opt in; you may withdraw permission at any time.",
    allow: "Allow analytics",
    reject: "Essential only",
    save: "Save my choices",
    currentAnalytics: "Current choice: analytics allowed",
    currentEssential: "Current choice: essential only",
    currentNone: "You have not chosen yet",
    note: "Your browser will save the choice and return to this page to confirm it.",
  },
};

export default function CookieSettingsPanel({ locale, choice }: { locale: AppLocale; choice: ConsentChoice }) {
  const c = words[locale];
  return (
    <section id="cookie-settings" aria-labelledby="cookie-settings-title"
      className="scroll-mt-24 bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-purple-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-purple-700">{c.eyebrow}</p>
        <h1 id="cookie-settings-title" className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{c.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{c.summary}</p>
        <p className="mt-4 text-sm font-semibold text-purple-800" role="status">
          {choice === "analytics" ? c.currentAnalytics : choice === "essential" ? c.currentEssential : c.currentNone}
        </p>
        <form method="POST" action="/api/privacy/cookie-choice" className="mt-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-bold text-slate-950">{c.essential}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{c.essentialAbout}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{c.required}</span>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-purple-200 bg-purple-50/40 p-4">
              <span>
                <span className="block font-bold text-slate-950">{c.optional}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{c.optionalAbout}</span>
              </span>
              <input name="analytics" value="yes" type="checkbox" defaultChecked={choice === "analytics"}
                aria-label={c.optional} className="mt-1 h-5 w-5 shrink-0 accent-purple-700" />
            </label>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button type="submit" name="choice" value="essential"
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
              {c.reject}
            </button>
            <button type="submit" name="choice" value="analytics"
              className="min-h-12 rounded-xl border border-purple-700 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-900 hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
              {c.allow}
            </button>
            <button type="submit" name="choice" value="custom"
              className="min-h-12 rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white hover:bg-purple-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
              {c.save}
            </button>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">{c.note}</p>
        </form>
      </div>
    </section>
  );
}

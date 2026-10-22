import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import CookieSettingsPanel from "@/components/cookie-settings-panel";
import type { LegalTranslations } from "@/lib/legal/types";
import { getServerLocale } from "@/lib/i18n/server";

const cookieLegal = {
  "zh-Hant": {
    "eyebrow": "Cookies & Browser Storage",
    "title": "Cookies 及瀏覽器儲存政策",
    "lead": "了解 HK Family Fun 使用哪些必要與可選擇的技術，以及如何隨時更改你的選擇。",
    "updated": "2026-10-15",
    "sections": [
      {
        "heading": "Cookies 與瀏覽器儲存的區別",
        "paragraphs": [
          "Cookie 是網站在瀏覽器中保存的小型資料；localStorage 及 sessionStorage 是其他瀏覽器儲存機制，也可能被用作識別同一訪客。以下一併披露，並非所有項目都是傳統 Cookies。"
        ]
      },
      {
        "heading": "必要功能與身份驗證",
        "paragraphs": [
          "登入、保安及 Google／Facebook 身份驗證可能使用 Supabase 身份認證工作階段儲存及 OAuth 暫存資料，以維持登入和保護帳戶。這些資料不屬於網站的可選流量分析。停用相關儲存可能無法登入。",
          "hkff_locale 是第一方語言偏好 Cookie，用來記住繁體中文、簡體中文或英文選擇；由網站的語言設定功能管理。"
        ]
      },
      {
        "heading": "Cookie 偏好記錄",
        "paragraphs": [
          "hkff_cookie_preferences 是第一方 Cookie，記錄 v1_essential（只使用必要功能）或 v1_analytics（同意可選分析）。它不包含訪客身份識別碼，儲存上限為 180 日；可以透過網站頁尾「Cookies 設定」重新選擇或撤回分析同意。"
        ]
      },
      {
        "heading": "可選第一方流量分析",
        "paragraphs": [
          "只有在你明確選擇同意後，網站才會建立 hkff_visitor_id（localStorage 中的隨機訪客識別碼）及 hkff_session_id（sessionStorage 中的隨機工作階段識別碼）。網站會收集公開頁面路徑、活動瀏覽、活動外部連結點擊、來源網站的主機名稱及裝置類別，用於分析活動內容表現。這些資料會傳送到 HK Family Fun 的 Supabase 分析資料庫。",
          "訪客識別碼會留在同一瀏覽器，直到你清除網站資料或撤回分析同意；工作階段識別碼通常在瀏覽器工作階段結束後消失。撤回同意會清除本網站已存的上述兩個識別碼並停止往後的分析請求，但不會自動刪除資料庫內早前合法收集的分析紀錄；如需查詢資料處理，可電郵 info@hkfamilyfun.com。"
        ]
      },
      {
        "heading": "你的選擇",
        "paragraphs": [
          "首次訪問時，你可選擇「只使用必要功能」、「同意流量分析」或開啟詳細設定。未作選擇前，不應建立上述訪客分析識別碼；不接受分析不影響活動搜尋及商戶登入等基本功能。你可透過每頁頁尾的 Cookies 設定隨時更改，撤回同意只對其後的收集生效。"
        ]
      },
      {
        "heading": "第三方網站及其他技術",
        "paragraphs": [
          "點擊 Google／Facebook 登入、活動主辦方、地圖、影片或報名連結時，相關第三方可能使用自己的 Cookies、隱私政策及追蹤技術。我們不能控制獨立第三方網站。若日後在本平台加入 Meta Pixel、Google Ads 或其他非必要追蹤，應先更新本政策及採取適當同意控制，不能直接將其視作已獲授權。"
        ]
      },
      {
        "heading": "安全及瀏覽器管理",
        "paragraphs": [
          "你可以在瀏覽器設定刪除或封鎖網站資料；封鎖必要身份驗證儲存可能影響部分功能。網站偏好紀錄不等同賬戶驗證或身份識別。如有私隱查詢、查閱或更正要求，請閱讀 /privacy 或電郵 info@hkfamilyfun.com。"
        ]
      }
    ]
  },
  "en": {
    "eyebrow": "Cookies & Browser Storage",
    "title": "Cookies and Browser Storage Policy",
    "lead": "Learn which technologies HK Family Fun uses for essential services and optional analytics and how to change your choices.",
    "updated": "2026-10-15",
    "sections": [
      {
        "heading": "Cookies Versus Browser Storage",
        "paragraphs": [
          "Cookies are small pieces of data stored by a browser. localStorage and sessionStorage are separate browser storage technologies that can also identify returning visitors. This notice covers all of them; not every item listed is technically a cookie."
        ]
      },
      {
        "heading": "Essential Features and Authentication",
        "paragraphs": [
          "Sign-in, security and Google/Facebook authentication may use Supabase session storage and temporary OAuth information to maintain your account and protect access. These are not part of our optional site analytics. Blocking them may prevent sign-in.",
          "hkff_locale is a first-party cookie remembering your Traditional Chinese, Simplified Chinese or English language setting."
        ]
      },
      {
        "heading": "Your Preference Cookie",
        "paragraphs": [
          "hkff_cookie_preferences is a first-party cookie containing v1_essential (essential features only) or v1_analytics (optional analytics allowed). It holds no visitor identifier and expires after at most 180 days. You can change or withdraw analytics permission through 'Cookie settings' in the website footer."
        ]
      },
      {
        "heading": "Optional First-Party Analytics",
        "paragraphs": [
          "Only after you opt in do we create hkff_visitor_id (a random persistent browser identifier in localStorage) and hkff_session_id (a random session identifier in sessionStorage). We record public page paths, event views, outbound event-link clicks, the referring site's hostname and device category to understand how activity listings perform. Data is sent to our Supabase analytics database.",
          "Your visitor identifier remains until you clear website data or withdraw analytics permission. The session identifier normally disappears at the end of a browser session. Withdrawing permission removes these two browser identifiers and prevents future analytics requests, but does not automatically delete previously collected database records. For enquiries about stored personal data, contact info@hkfamilyfun.com."
        ]
      },
      {
        "heading": "Your Choices",
        "paragraphs": [
          "On your first visit you can select 'Essential only', 'Allow analytics' or review detailed settings. No analytics visitor identifier should be created before consent. Refusing analytics does not prevent ordinary searches or merchant sign-in. You can reopen Cookie settings from the footer at any time. Withdrawal applies to future collection."
        ]
      },
      {
        "heading": "External Websites and New Tracking Tools",
        "paragraphs": [
          "Google/Facebook login, organizer sites, maps, video embeds and external registration services may use their own cookies and privacy policies, beyond our control. If we later deploy Meta Pixel, Google Ads or other non-essential tracking, we must update this notice and implement appropriate preference controls first; current analytics consent does not authorize unrelated marketing trackers."
        ]
      },
      {
        "heading": "Browser Controls and Contact",
        "paragraphs": [
          "You can clear or block browser storage in your browser, although blocking necessary authentication storage may disable sign-in. Preferences are not proof of account identity. For privacy, access or correction requests see /privacy or email info@hkfamilyfun.com."
        ]
      }
    ]
  },
  "zh-Hans": {
    "eyebrow": "Cookies & Browser Storage",
    "title": "Cookies 及浏览器存储政策",
    "lead": "了解 HK Family Fun 使用的必要功能和可选分析技术，以及如何随时更改设置。",
    "updated": "2026-10-15",
    "sections": [
      {
        "heading": "Cookies 与浏览器存储的区别",
        "paragraphs": [
          "Cookie 是网站保存在浏览器中的小型数据；localStorage 和 sessionStorage 是其他浏览器存储机制，也可能用于识别同一访客。以下一并说明，并非全部属于传统 Cookies。"
        ]
      },
      {
        "heading": "必要功能及身份验证",
        "paragraphs": [
          "登录、安全及 Google／Facebook 身份验证可能使用 Supabase 会话存储和 OAuth 临时信息，以维持登录和保障账户。这些不属于网站的可选流量分析。禁用相关存储可能无法登录。",
          "hkff_locale 是第一方语言偏好 Cookie，用于记住繁体中文、简体中文或英文设置。"
        ]
      },
      {
        "heading": "偏好记录 Cookie",
        "paragraphs": [
          "hkff_cookie_preferences 是第一方 Cookie，记录 v1_essential（仅必要功能）或 v1_analytics（同意可选分析）。不包含访客识别码，最长有效期为 180 天。可通过网站页脚“Cookies 设置”更改或撤回选择。"
        ]
      },
      {
        "heading": "可选第一方流量分析",
        "paragraphs": [
          "仅在你明确同意后，网站才会建立 hkff_visitor_id（localStorage 中的随机持久访客识别码）及 hkff_session_id（sessionStorage 中的随机会话识别码）。我们记录公开页面路径、活动浏览、外部活动链接点击、来源网站主机名及设备类别，以分析活动表现，数据发送至 HK Family Fun 的 Supabase 分析数据库。",
          "访客识别码保留至清除网站数据或撤回同意；会话识别码通常在浏览器会话结束后消失。撤回同意会删除浏览器内上述识别码及停止后续分析请求，但不自动删除数据库内过去收集的分析记录。如需查询请联系 info@hkfamilyfun.com。"
        ]
      },
      {
        "heading": "你的选择",
        "paragraphs": [
          "首次访问时，可选择“仅必要功能”、“同意流量分析”或管理详细设置。未经同意不得建立上述分析访客识别码。拒绝分析不影响一般活动搜索或商户登录。页脚可随时重开设置，撤回仅影响未来数据收集。"
        ]
      },
      {
        "heading": "第三方网站及新增追踪工具",
        "paragraphs": [
          "Google／Facebook 登录、主办方网站、地图、视频及外部报名服务可能使用其自身 Cookies 与隐私政策，本平台无法控制。如日后增加 Meta Pixel、Google Ads 等非必要追踪，须先更新政策并实施适当同意控制；现有分析同意不自动授权其他营销追踪。"
        ]
      },
      {
        "heading": "浏览器管理与联系",
        "paragraphs": [
          "可通过浏览器设置清除或禁用网站存储，但禁用必要身份验证数据可能影响登录。偏好记录不是账户身份凭证。如需隐私查询、查阅或更正，请参阅 /privacy 或发送邮件至 info@hkfamilyfun.com。"
        ]
      }
    ]
  }
} satisfies LegalTranslations;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: cookieLegal[locale].title,
    description: cookieLegal[locale].lead,
    alternates: { canonical: "/cookies" },
  };
}

export default async function CookiesPolicyPage() {
  const locale = await getServerLocale();
  return <>
    <CookieSettingsPanel locale={locale} />
    <LegalPolicyPage translations={cookieLegal} />
  </>;
}

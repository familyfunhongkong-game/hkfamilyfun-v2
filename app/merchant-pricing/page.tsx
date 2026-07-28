import Link from "next/link";

type Plan = {
  code: string;
  name: string;
  price: string;
  unit: string;
  tagline: string;
  bestFor: string;
  badge?: string;
  highlight?: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: string[];
};

const plans: Plan[] = [
  {
    code: "A",
    name: "新商戶啟動優惠",
    price: "HK$0",
    unit: "首個活動",
    tagline: "先免費上架一個活動，測試平台曝光效果。",
    bestFor: "適合首次使用 HK Family Fun 的商戶、NGO、社區活動或小型親子工作坊。",
    ctaLabel: "免費登記",
    ctaHref: "/merchant/register",
    features: [
      "首個活動免費上架",
      "3 個月商戶啟動期",
      "啟動期內每月最多 4 個活動",
      "第一個活動可由 HK Family Fun 免費協助整理及上架",
      "每個活動展示至活動完結日，最長 60 日",
      "不包括首頁推薦、社交媒體轉發或精選推廣位置",
      "每個商戶只限使用一次",
    ],
  },
  {
    code: "B",
    name: "單次活動刊登",
    price: "HK$180",
    unit: "每個活動",
    tagline: "有一個清楚活動，需要增加家長搜尋曝光。",
    bestFor: "適合每月 1–2 個活動的工作坊、興趣班、商戶快閃活動。",
    ctaLabel: "選擇單次刊登",
    ctaHref: "/merchant/register",
    features: [
      "1 個活動刊登",
      "展示至活動完結日，最長 60 日",
      "可加入官方報名頁、WhatsApp、Google Form 或網站連結",
      "活動頁展示日期、地點、收費、年齡、分類及標籤",
      "基本瀏覽數據",
      "活動資料可修改",
    ],
  },
  {
    code: "C",
    name: "代上架服務",
    price: "HK$280",
    unit: "每個活動",
    tagline: "你提供資料，我們協助整理成家長易明的活動頁。",
    bestFor: "適合沒有時間自己輸入資料，或只有海報、PDF、社交帖文的商戶。",
    ctaLabel: "查詢代上架",
    ctaHref: "/merchant-join",
    features: [
      "包含單次活動刊登",
      "商戶提供海報、活動網址、PDF 或基本資料",
      "HK Family Fun 協助整理活動標題、日期、地點、收費及報名方式",
      "協助加入分類及標籤",
      "基本瀏覽數據",
      "活動資料可修改",
    ],
  },
  {
    code: "D",
    name: "月費商戶方案",
    price: "HK$480",
    unit: "每月",
    tagline: "最適合穩定舉辦親子活動的商戶。",
    bestFor: "適合每月 5–8 個活動的活動中心、商場合作單位、教育機構或親子品牌。",
    badge: "建議主力",
    highlight: true,
    ctaLabel: "選擇月費方案",
    ctaHref: "/merchant/register",
    features: [
      "每月最多 8 個活動",
      "Merchant Portal 自行上載及修改活動",
      "可使用智能匯入草稿整理活動資料",
      "每月 1 次 FB / IG 活動轉發",
      "1 個活動列入分類精選",
      "優先審批",
      "每月簡易成效報告",
    ],
  },
  {
    code: "E",
    name: "大型活動 / 商場 / 品牌推廣",
    price: "HK$980",
    unit: "起",
    tagline: "需要更高曝光、品牌展示或多活動推廣。",
    bestFor: "適合商場、樂園、展覽、品牌活動、大型親子節目或年度 campaign。",
    ctaLabel: "查詢品牌合作",
    ctaHref: "/merchant-join",
    features: [
      "按項目報價",
      "多活動展示",
      "首頁推薦位置",
      "社交媒體推廣",
      "活動文案基本優化",
      "可配合分類精選或專題頁",
      "成效報告及合作建議",
    ],
  },
];

const steps = [
  {
    title: "免費登記商戶帳戶",
    description: "提交商戶名稱、聯絡資料及官方活動渠道。",
  },
  {
    title: "建立或匯入活動",
    description: "可手動新增，或使用活動網址、海報、PDF 產生智能匯入草稿。",
  },
  {
    title: "預覽後提交審批",
    description: "商戶確認內容後提交，HK Family Fun 審批後才公開顯示。",
  },
];

const requiredInfo = [
  "商戶名稱",
  "活動名稱",
  "活動日期及時間",
  "場地名稱及地址",
  "地區及港鐵站",
  "收費資料",
  "適合年齡",
  "活動圖片 / 海報",
  "官方報名連結 / WhatsApp / Google Form",
];

const listingRules = [
  "每個活動由審批上架日起，展示至活動完結日，最長 60 日。",
  "如活動超過 60 日，可續期、轉月費方案，或改用長期課程 / 常設活動方案。",
  "同一活動在 60 日內的重複場次，可當作 1 個活動處理。",
  "不同月份 intake、不同主題、不同報名頁，需分開刊登。",
  "長期課程 / 常設活動，不建議當普通單次活動處理。",
];

const comparisonRows = [
  {
    label: "適合對象",
    a: "首次商戶",
    b: "少量活動",
    c: "想代整理",
    d: "穩定活動商戶",
    e: "商場 / 品牌",
  },
  {
    label: "活動數量",
    a: "首個免費",
    b: "1 個",
    c: "1 個",
    d: "每月最多 8 個",
    e: "按項目",
  },
  {
    label: "商戶自行修改",
    a: "支援",
    b: "支援",
    c: "支援",
    d: "支援",
    e: "支援",
  },
  {
    label: "官方報名連結導流",
    a: "支援",
    b: "支援",
    c: "支援",
    d: "支援",
    e: "支援",
  },
  {
    label: "HK Family Fun 協助整理",
    a: "首個活動",
    b: "不包括",
    c: "包括",
    d: "部分支援",
    e: "可安排",
  },
  {
    label: "社交媒體轉發",
    a: "不包括",
    b: "不包括",
    c: "不包括",
    d: "每月 1 次",
    e: "可安排",
  },
  {
    label: "分類精選 / 推薦位",
    a: "不包括",
    b: "不包括",
    c: "不包括",
    d: "每月 1 個",
    e: "可安排",
  },
  {
    label: "成效報告",
    a: "不包括",
    b: "基本數據",
    c: "基本數據",
    d: "簡易月報",
    e: "合作報告",
  },
];

const faqs = [
  {
    question: "HK Family Fun 會否代收活動費用？",
    answer:
      "現階段不會。家長會直接前往商戶官方報名頁、WhatsApp、Google Form 或網站完成報名及付款。",
  },
  {
    question: "免費上架是否等於永久免費？",
    answer:
      "不是。新商戶啟動優惠只適用於首個活動及啟動期內測試使用，後續可按需要選擇單次刊登、代上架或月費方案。",
  },
  {
    question: "活動可以展示多久？",
    answer:
      "每個活動由審批上架日起展示至活動完結日，最長 60 日。超過 60 日的活動需要續期或使用更合適的長期方案。",
  },
  {
    question: "我只有海報或 Facebook / Instagram 帖文，可以上架嗎？",
    answer:
      "可以。你可以提交海報、PDF、活動網址或社交帖文資料。HK Family Fun 會協助整理，或使用智能匯入草稿輔助建立活動頁。",
  },
  {
    question: "平台是否保證報名人數？",
    answer:
      "不保證。HK Family Fun 提供活動曝光、搜尋、資料展示及導流服務，但不保證報名、銷售或參加人數結果。",
  },
];

export default function MerchantPricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-purple-700">
                HK Family Fun 商戶方案
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                首次免費上架，
                <br />
                之後按活動數量選擇合適方案
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                HK Family Fun 不是票務平台，而是香港親子活動搜尋及導流平台。
                商戶可透過活動頁、分類標籤、地區搜尋、附近地圖及官方報名連結，
                讓更多家長在需要時找到你的活動。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/merchant/register"
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-purple-800"
                >
                  免費登記成為商戶
                </Link>
                <Link
                  href="/merchant/events/import"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  試用智能匯入活動
                </Link>
                <Link
                  href="/merchant-join"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  了解商戶合作
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  活動曝光
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  官方報名導流
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  商戶後台管理
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  智能匯入草稿
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-pink-100 bg-white p-6 shadow-xl shadow-purple-100/60">
              <p className="text-sm font-black text-pink-700">建議主力</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                月費商戶方案
              </h2>
              <p className="mt-4 text-5xl font-black text-pink-600">
                HK$480
                <span className="text-base font-bold text-slate-500"> / 月</span>
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                適合每月 5–8 個親子活動的商戶。可自行上載及修改活動，
                並包括分類精選、優先審批、每月 1 次社交媒體轉發及簡易成效報告。
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "每月最多 8 個活動",
                  "Merchant Portal 自行管理",
                  "1 個活動列入分類精選",
                  "每月簡易成效報告",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-bold text-pink-800"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">開始流程</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              3 步完成第一個活動刊登
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            商戶不需要一次過理解所有系統功能。先把第一個活動整理清楚，
            再逐步升級至月費方案或品牌推廣。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-700 text-sm font-black text-white">
                {index + 1}
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">方案選擇</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              按活動數量、整理需要及曝光目標選擇
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            所有方案均以活動展示、搜尋曝光及官方報名連結導流為主。
            HK Family Fun 現階段不代收活動款項。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={`relative rounded-[1.75rem] border p-5 shadow-sm ${
                plan.highlight
                  ? "border-pink-300 bg-pink-50 ring-2 ring-pink-100"
                  : "border-slate-200 bg-white"
              }`}
            >
              {plan.badge ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pink-600 px-4 py-1 text-xs font-black text-white shadow-sm">
                  {plan.badge}
                </div>
              ) : null}

              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-purple-700">
                {plan.code}
              </div>

              <h3 className="text-lg font-black leading-7 text-slate-950">
                {plan.name}
              </h3>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {plan.price}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {plan.unit}
              </p>
              <p className="mt-3 min-h-[66px] text-sm leading-6 text-slate-600">
                {plan.tagline}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <span className="font-black text-slate-800">適合：</span>
                {plan.bestFor}
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-black text-purple-700">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-6 flex rounded-2xl px-4 py-3 text-center text-sm font-black ${
                  plan.highlight
                    ? "bg-pink-600 text-white hover:bg-pink-700"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-purple-700"
                }`}
              >
                <span className="w-full">{plan.ctaLabel}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-blue-700">方案比較</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                商戶可清楚知道每個方案包括甚麼
              </h2>
            </div>
            <Link
              href="/merchant/register"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              免費開始
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="rounded-l-2xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                    項目
                  </th>
                  <th className="bg-slate-100 px-4 py-3 font-black text-slate-700">
                    新商戶優惠
                  </th>
                  <th className="bg-slate-100 px-4 py-3 font-black text-slate-700">
                    單次刊登
                  </th>
                  <th className="bg-slate-100 px-4 py-3 font-black text-slate-700">
                    代上架
                  </th>
                  <th className="bg-pink-100 px-4 py-3 font-black text-pink-800">
                    月費方案
                  </th>
                  <th className="rounded-r-2xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                    品牌推廣
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border-b border-slate-100 px-4 py-4 font-black text-slate-800">
                      {row.label}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                      {row.a}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                      {row.b}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                      {row.c}
                    </td>
                    <td className="border-b border-pink-100 bg-pink-50/50 px-4 py-4 font-bold text-pink-800">
                      {row.d}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                      {row.e}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6">
          <p className="text-sm font-black text-emerald-700">商戶需要準備</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            準備以下資料，上架會更快
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {requiredInfo.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-purple-700">智能匯入草稿</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            減少重複輸入，先由 AI 協助整理活動資料
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            商戶可以先貼上活動網址、上載海報或 PDF，系統會以智能匯入草稿形式
            協助整理活動主題、日期、地點、地區、港鐵站、收費、分類及報名方式。
            商戶仍需要檢查及確認後，才提交 HK Family Fun 審批。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/merchant/events/import"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              試用智能匯入
            </Link>
            <Link
              href="/merchant/register"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              免費登記商戶
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-purple-700">活動刊登規則</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            防止長期活動被當作單次活動刊登
          </h2>
          <ul className="mt-5 space-y-4">
            {listingRules.map((rule, index) => (
              <li key={rule} className="flex gap-3 text-sm leading-7 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
                  {index + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-black text-amber-800">重要說明</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-amber-900">
            <p>
              HK Family Fun 現階段不代收活動款項；家長會直接連到商戶官方報名渠道。
            </p>
            <p>
              平台提供活動曝光、搜尋、資料展示及導流服務，不保證報名、銷售或參加人數結果。
            </p>
            <p>所有活動資料以主辦方最終公布為準。</p>
            <p>
              票務、訂單、付款及核銷功能仍在開發中，正式開放前不會向家長收取活動款項。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-black text-purple-700">常見問題</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            商戶加入前最常問的問題
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <summary className="cursor-pointer text-sm font-black text-slate-900">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                先免費上架首個活動，再選擇合適方案
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                你可以先測試 HK Family Fun 的活動頁、搜尋曝光、附近地圖及官方報名導流效果。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/merchant/register"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-purple-700 hover:bg-purple-50"
              >
                免費登記商戶
              </Link>
              <Link
                href="/merchant/events/import"
                className="rounded-full border border-white/40 px-5 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                試用智能匯入
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";

const freeIncluded = [
  "Merchant Portal 自行建立及修改活動",
  "活動網址智能匯入草稿",
  "上載活動圖片、日期、地點、年齡、價錢及分類資料",
  "提交 HK Family Fun 審批",
  "批准後在正常活動列表、搜尋、日曆及相關頁面展示",
  "導流到主辦方官方報名頁／WhatsApp／網站",
];

const paidPromotion = [
  {
    title: "活動 Featured",
    description: "在指定活動瀏覽位置增加額外曝光，屬付費推廣，不影響一般免費活動 Listing。",
  },
  {
    title: "首頁 Banner / Hero",
    description: "適合大型活動、商場、品牌 campaign 或重點檔期，按位置及投放期報價。",
  },
  {
    title: "Sponsored Content",
    description: "適合品牌故事、專題或合作內容；所有付費內容會清楚標示 Sponsored。",
  },
];

export default function MerchantPricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-emerald-50/40 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-emerald-700">
            HK Family Fun Merchant
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            一般活動刊登免費，
            <br />
            想要更多曝光先付費
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            HK Family Fun 將「正常活動 Listing」同「付費廣告曝光」分開。
            商戶可以免費建立及提交一般活動；只有主動選擇 Featured、Banner 或 Sponsored 推廣服務時才需要付費。
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-black text-emerald-700">一般活動 Listing</p>
              <h2 className="mt-2 text-3xl font-black">HK$0</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                不收活動上載或正常刊登費
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                活動仍需經 HK Family Fun 審批。正常 Listing 不保證固定排名、首頁位置、流量或報名量。
              </p>
              <Link
                href="/merchant/register"
                className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
              >
                免費登記商戶
              </Link>
            </article>

            <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7">
              <p className="text-sm font-black text-amber-800">額外曝光</p>
              <h2 className="mt-2 text-3xl font-black">Paid Promotion</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                Banner、Featured、Sponsored Content 會按版位、檔期、投放時間及合作內容另行確認報價。
                提交查詢不等於已預留版位；付款確認後先會安排上架。
              </p>
              <Link
                href="/merchant/advertising"
                className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                查看／提交廣告查詢
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-emerald-700">免費包括</p>
          <h2 className="mt-2 text-2xl font-black">一般活動管理核心功能</h2>
          <ul className="mt-5 space-y-3">
            {freeIncluded.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
                <span className="mt-1 font-black text-emerald-600">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-purple-200 bg-purple-50 p-6">
          <p className="text-sm font-black text-purple-700">付費推廣選項</p>
          <h2 className="mt-2 text-2xl font-black">有需要先買曝光</h2>
          <div className="mt-5 space-y-4">
            {paidPromotion.map((item) => (
              <article key={item.title} className="rounded-2xl bg-white p-4">
                <h3 className="font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-blue-200 bg-blue-50 p-7">
            <p className="text-sm font-black text-blue-700">現階段報名付款</p>
            <h2 className="mt-2 text-2xl font-black">由主辦方自己的渠道處理</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              HK Family Fun 現階段不代收活動款項、不代替商戶接受報名。
              家長會由活動頁前往主辦方官方網站、WhatsApp、Google Form 或其他官方報名渠道。
            </p>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white">
            <p className="text-sm font-black text-purple-200">Future</p>
            <h2 className="mt-2 text-2xl font-black">Sell with Family Fun</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              平台日後流量及活躍商戶足夠，並完成 checkout、退款、商戶驗證、佣金、payout 及完整 QA 後，
              才會考慮開放 Family Fun 原生售票。現時尚未啟用。
            </p>
          </article>
        </div>

        <p className="mt-6 text-xs leading-6 text-slate-500">
          付費推廣不保證固定曝光量、點擊、報名或銷售結果；實際合作內容以 HK Family Fun 確認的報價及安排為準。
        </p>
      </section>
    </main>
  );
}

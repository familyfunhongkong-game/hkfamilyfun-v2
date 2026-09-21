import Link from "next/link";

const included = [
  "Merchant Portal 自行建立及修改活動",
  "活動網址智能匯入草稿",
  "每月最多 4 個已發布活動",
  "活動圖片、日期、地點、年齡、價錢及分類展示",
  "官方報名頁／WhatsApp／網站導流",
  "Admin 審批後才公開發布",
];

const notIncluded = [
  "HK Family Fun 不代收活動款項",
  "HK Family Fun 不代替商戶接受報名",
  "不保證瀏覽量、報名量或銷售結果",
  "Banner、Sponsored Post 及大型品牌合作另行報價",
];

export default function MerchantPricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-purple-700">
            HK Family Fun Merchant Pilot
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            先免費試用 3 個月，
            <br />
            再用簡單月費繼續管理活動
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            HK Family Fun 現階段專注活動搜尋、資料展示及導流。
            商戶仍使用自己的官方報名及付款渠道，平台不代收款、不代報名。
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-black text-emerald-700">首批商戶試用</p>
              <h2 className="mt-2 text-3xl font-black">HK$0</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">首 3 個月</p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                用實際活動測試 Merchant Portal、活動審批及家長搜尋流程。
              </p>
              <Link
                href="/merchant/register"
                className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
              >
                免費登記商戶
              </Link>
            </article>

            <article className="rounded-[2rem] border border-purple-200 bg-purple-50 p-7 shadow-sm">
              <p className="text-sm font-black text-purple-700">標準商戶方案</p>
              <h2 className="mt-2 text-3xl font-black">
                HK$180
                <span className="text-base font-bold text-slate-500"> / 月</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                試用期後適合持續舉辦親子活動的商戶。付款功能暫不在網站內處理；
                正式收費前會由 HK Family Fun 與商戶確認續用安排。
              </p>
              <Link
                href="/merchant-join"
                className="mt-6 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
              >
                了解合作方式
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-purple-700">方案包括</p>
          <h2 className="mt-2 text-2xl font-black">活動管理核心功能</h2>
          <ul className="mt-5 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
                <span className="mt-1 font-black text-emerald-600">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-black text-amber-800">重要說明</p>
          <h2 className="mt-2 text-2xl font-black">唔會將平台講成票務系統</h2>
          <ul className="mt-5 space-y-3">
            {notIncluded.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-amber-900">
                <span className="mt-1 font-black">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white">
          <p className="text-sm font-black text-purple-200">大型合作</p>
          <h2 className="mt-2 text-2xl font-black">
            Banner、Sponsored Event、商場／品牌專題
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
            純商業宣傳、品牌 campaign、首頁 Banner 或大型專題不屬一般活動刊登，
            會按曝光位置、內容製作及合作期另行報價。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20Merchant%20Partnership"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Email 查詢
            </a>
            <a
              href="https://wa.me/85257018297"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white"
            >
              WhatsApp 留言
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

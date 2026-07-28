import Link from "next/link";

const painPoints = [
  {
    number: "1",
    title: "帖文壽命短",
    description:
      "FB / IG 出帖後很快被新內容蓋過，活動日期、地點、年齡及報名資料難以長時間被搜尋。",
  },
  {
    number: "2",
    title: "資料分散",
    description:
      "官網、Google Form、社交帖文、海報各自分開，家長需要自己慢慢比較，容易流失。",
  },
  {
    number: "3",
    title: "精準家長難觸達",
    description:
      "想找今日、今個週末、附近港鐵站、免費、SEN 友善活動的家長，未必會被社交平台準確推送到。",
  },
];

const platformActions = [
  {
    title: "整理活動頁",
    description:
      "把活動名稱、日期、時間、地點、圖片、收費及報名連結，以家長容易理解的方式展示。",
  },
  {
    title: "分類及標籤",
    description:
      "按地區、港鐵站、日期、免費、SEN 友善、室內／戶外、適合年齡等分類。",
  },
  {
    title: "審批後刊登",
    description:
      "商戶提交活動資料後，HK Family Fun 會先審核資料清晰度及基本合適性，再公開展示。",
  },
  {
    title: "持續內容曝光",
    description:
      "活動可被家長透過搜尋、分類、地區、日期、活動日曆及附近活動地圖找到，不只依賴一次性社交帖文。",
  },
];

const workflowSteps = [
  "貼上活動網址",
  "上載活動海報 / PDF",
  "AI 產生智能匯入草稿",
  "商戶檢查及補資料",
  "預覽活動頁",
  "提交 HK Family Fun 審批",
];

const merchantInputs = [
  "商戶名稱",
  "活動資料",
  "活動圖片 / 海報",
  "官方報名連結",
  "WhatsApp / Google Form / 網站連結",
];

const parentBenefits = [
  "更快搜尋今日及週末活動",
  "更易比較地區、收費及年齡",
  "更清楚判斷是否需要報名",
  "更直接到商戶官方渠道報名",
];

const suitableFor = [
  {
    title: "親子活動中心",
    description: "定期舉辦手作、STEAM、藝術、運動或興趣班活動。",
  },
  {
    title: "商場及大型場地",
    description: "需要集中展示節日活動、親子市集、打卡裝置或品牌體驗。",
  },
  {
    title: "教育及培訓機構",
    description: "希望家長更容易按年齡、地區、港鐵站及課程類型找到活動。",
  },
  {
    title: "NGO / 社區中心",
    description: "需要讓更多家庭知道免費、低收費或社區親子活動。",
  },
];

const aiDraftFields = [
  "活動標題",
  "活動主題",
  "短簡介",
  "日期及時間",
  "場地及地址",
  "地區及港鐵站",
  "收費資料",
  "適合年齡",
  "活動分類及標籤",
  "報名方式及官方連結",
];

export default function MerchantJoinPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-purple-700">
                HK Family Fun 商戶合作
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                你專心辦好活動，
                <br />
                HK Family Fun 幫你被家長找到
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                HK Family Fun 不是多一個廣告位，而是一個讓家長主動搜尋親子活動的平台。
                我們協助商戶整理活動資料、分類標籤、展示活動頁，並導流到商戶官方報名渠道。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/merchant/register"
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-purple-800"
                >
                  免費登記成為商戶
                </Link>
                <Link
                  href="/merchant-pricing"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  查看商戶方案
                </Link>
                <Link
                  href="/merchant/login"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  登入商戶後台
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  活動搜尋曝光
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  附近活動地圖
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  官方報名導流
                </span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                  智能匯入草稿
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-xl shadow-purple-100/60">
              <p className="text-sm font-black text-purple-700">
                商戶自助流程
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                由活動資料到公開展示
              </h2>

              <div className="mt-6 space-y-3">
                {workflowSteps.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                AI 匯入功能會以「智能匯入草稿」形式協助整理資料；
                商戶仍需要檢查及確認後才提交審批，不會自動公開發布。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-black text-pink-700">商戶最痛</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            活動做得好，但曝光不穩定
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            真正問題不是活動不好，而是家長未能在正確時間、正確位置看到你。
            社交平台適合宣傳，但不適合長期整理活動資料及被搜尋。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {painPoints.map((point) => (
            <article
              key={point.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-lg font-black text-pink-700">
                {point.number}
              </span>
              <h3 className="mt-5 text-xl font-black text-slate-950">
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {point.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-black text-purple-700">
                What We Do For You
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                由內容整理、分類標籤、活動頁展示，到導流到官方報名連結
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                你提供活動資料，HK Family Fun 幫你整理、分類、展示、導流。
                現階段平台不代收活動款項，家長會直接前往商戶官方渠道報名。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/merchant-pricing"
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
                >
                  查看收費方案
                </Link>
                <a
                  href="https://wa.me/85257018297"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                >
                  WhatsApp 查詢
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {platformActions.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <h3 className="font-black text-slate-950">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-black text-purple-700">適合哪些商戶？</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            不同規模的親子活動，都可以用同一套活動展示流程
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {suitableFor.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-black text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-sm font-black text-blue-700">你提供</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                商戶只需準備基本資料
              </h2>
              <ul className="mt-5 space-y-3">
                {merchantInputs.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm font-bold text-slate-700"
                  >
                    <span className="mt-1 h-3 w-3 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-black text-purple-700">我哋處理</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                平台協助整理及展示
              </h2>
              <ul className="mt-5 space-y-3">
                {platformActions.map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 text-sm font-bold text-slate-700"
                  >
                    <span className="mt-1 h-3 w-3 rounded-full bg-purple-500" />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-black text-emerald-700">家長得到</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                更清楚的活動選擇
              </h2>
              <ul className="mt-5 space-y-3">
                {parentBenefits.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm font-bold text-slate-700"
                  >
                    <span className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-purple-700">
            AI 減少重複輸入
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            貼網址或上載海報，先產生智能匯入草稿
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            商戶不應該重複把同一個活動資料在官網、社交平台及活動平台再填一次。
            HK Family Fun 的方向是讓商戶貼上活動網址、上載海報或 PDF，
            系統協助整理成可編輯活動草稿。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/merchant/events/import"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              前往智能匯入活動
            </Link>
            <Link
              href="/merchant-pricing"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              查看商戶方案
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-sm font-black text-purple-200">
            智能匯入草稿會嘗試整理
          </p>
          <h2 className="mt-2 text-2xl font-black">
            活動資料不再由零開始填
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {aiDraftFields.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
              >
                ✓ {item}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-white/70">
            注意：智能匯入草稿是輔助工具，商戶仍需要檢查活動資料是否正確，
            並在提交前確認日期、地點、收費及報名方式。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
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

        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6">
          <p className="text-sm font-black text-emerald-700">下一步</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            先免費上架首個活動
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            你可以先用免費啟動優惠測試 HK Family Fun 的活動搜尋、附近活動地圖、
            活動頁展示及官方報名導流效果，再按需要選擇單次刊登或月費方案。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/merchant/register"
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              免費登記商戶
            </Link>
            <a
              href="https://wa.me/85257018297"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-300 bg-white px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
            >
              WhatsApp 查詢
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                加入首批 Merchant Partner
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                趁早成為家長搜尋習慣入面的第一批活動商戶。
                先免費上架首個活動，再逐步選擇合適方案。
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
                href="/merchant-pricing"
                className="rounded-full border border-white/40 px-5 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                查看收費方案
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
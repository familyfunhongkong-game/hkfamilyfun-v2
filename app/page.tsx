import Link from "next/link";

const quickActions = [
  {
    title: "今日活動",
    subtitle: "即睇今日有咩親子節目",
    href: "/events?date=today",
    tone: "bg-pink-50 border-pink-100 text-pink-700",
    icon: "⏰",
  },
  {
    title: "活動日曆",
    subtitle: "按日期計劃週末親子時間",
    href: "/events?view=calendar",
    tone: "bg-blue-50 border-blue-100 text-blue-700",
    icon: "🗓️",
  },
  {
    title: "附近活動地圖",
    subtitle: "用地圖搵附近親子活動",
    href: "/events/map",
    tone: "bg-teal-50 border-teal-100 text-teal-700",
    icon: "🗺️",
  },
];

const categories = [
  { label: "免費活動", href: "/events?price=free", icon: "🎁" },
  { label: "商場活動", href: "/events?category=mall", icon: "🏬" },
  { label: "手作工作坊", href: "/events?category=workshop", icon: "🎨" },
  { label: "SEN 友善", href: "/events?sen=true", icon: "💛" },
  { label: "室內活動", href: "/events?indoor=true", icon: "🏠" },
  { label: "今個週末", href: "/events?date=weekend", icon: "🌈" },
];

const sponsoredCards = [
  {
    title: "大型商場親子節",
    location: "九龍 / 新界",
    description: "適合大型商場、節日活動及親子打卡 campaign 的首頁推廣位置。",
    tag: "推廣",
  },
  {
    title: "親子工作坊精選",
    location: "港島 / 九龍",
    description: "適合教育中心、手作班、STEAM、藝術及週末體驗活動。",
    tag: "分類精選",
  },
  {
    title: "品牌合作活動",
    location: "全港",
    description: "適合品牌曝光、家庭客群導流及大型活動專題推廣。",
    tag: "合作推廣",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black text-purple-700">
              HK Family Fun 香港親子活動搜尋平台
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              家長搵活動，
              <br />
              商戶少填表。
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              HK Family Fun 幫香港家庭搜尋今日活動、活動日曆、附近活動地圖及親子好去處；
              同時讓商戶用更少時間管理及展示活動資料，並導流到官方報名渠道。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-purple-800"
              >
                搜尋親子活動
              </Link>
              <Link
                href="/events/map"
                className="rounded-full border border-teal-300 bg-teal-50 px-5 py-3 text-sm font-black text-teal-700 hover:bg-teal-100"
              >
                尋找附近活動地圖
              </Link>
              <Link
                href="/merchant-join"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
              >
                商戶加入
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
                >
                  <div className="text-2xl">{item.icon}</div>
                  <h2 className="mt-2 text-base font-black text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-xl shadow-purple-100/60">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs font-black text-pink-300">
                    首頁 Hero Media Placement
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">
                    圖片 / Video 推廣位
                  </h2>
                </div>
                <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950">
                  推廣
                </span>
              </div>

              <div className="relative flex min-h-[270px] items-center justify-center bg-gradient-to-br from-purple-700 via-blue-600 to-teal-500 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.22),transparent_30%)]" />

                <div className="relative max-w-sm text-center text-white">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 text-3xl backdrop-blur">
                    ▶
                  </div>
                  <h3 className="mt-5 text-2xl font-black">
                    可放 15–30 秒活動影片
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/85">
                    適合商場大型活動、品牌 campaign、樂園合作、節日親子活動。
                    Video 建議 muted / playsInline，不自動播放聲音。
                  </p>
                </div>
              </div>

              <div className="bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {["活動曝光", "首頁首屏", "官方導流"].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-black text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              此位置日後可由 Admin 管理圖片、影片、連結、開始日期、結束日期及推廣標籤。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.42fr]">
            <div className="bg-gradient-to-r from-amber-100 via-pink-100 to-purple-100 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                  Featured Campaign Banner
                </span>
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                  合作推廣
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black text-slate-950">
                今週精選親子活動推廣位
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                可放橫幅圖片、活動 video poster、商場節日活動、品牌合作或大型親子 campaign。
                所有付費或合作推廣內容會清楚標示，不會偽裝成自然排序。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  查看精選活動
                </Link>
                <Link
                  href="/merchant-pricing"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  查詢推廣方案
                </Link>
              </div>
            </div>

            <div className="flex min-h-[230px] items-center justify-center bg-slate-950 p-6 text-white">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/10 text-4xl">
                  🖼️
                </div>
                <p className="mt-4 text-sm font-black">橫幅圖片 / Video Poster</p>
                <p className="mt-2 text-xs leading-6 text-white/65">
                  例如：暑假活動合集、商場親子節、品牌體驗日
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">快速探索</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              家長最常搜尋的活動分類
            </h2>
          </div>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
          >
            查看全部活動
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {categories.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
            >
              <div className="text-3xl">{item.icon}</div>
              <p className="mt-3 text-sm font-black text-slate-900">
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-pink-700">Sponsored Placement</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              合作推廣活動位置
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              適合月費方案、分類精選、商場活動、品牌合作及大型 campaign。
              付費或合作內容必須標示「推廣」。
            </p>
          </div>

          <Link
            href="/merchant-pricing"
            className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
          >
            查看商戶方案
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {sponsoredCards.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-pink-700 shadow-sm">
                  {item.tag}
                </span>
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/80 text-3xl shadow-sm">
                    ⭐
                  </div>
                  <p className="mt-3 text-xs font-black text-slate-500">
                    可放活動圖片 / 海報
                  </p>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-black text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm font-bold text-purple-700">
                  {item.location}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>

                <div className="mt-5 flex gap-3">
                  <Link
                    href="/events"
                    className="flex-1 rounded-2xl bg-purple-700 px-4 py-3 text-center text-sm font-black text-white hover:bg-purple-800"
                  >
                    查看活動
                  </Link>
                  <Link
                    href="/merchant-pricing"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                  >
                    推廣
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-teal-700">附近活動地圖</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              用地圖搵附近親子活動
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              家長可按地區、港鐵站、活動類型及位置搜尋附近活動。
              這亦是商戶活動曝光的重要入口。
            </p>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-200">
              <div className="relative h-64 bg-gradient-to-br from-teal-100 via-blue-100 to-slate-200">
                <div className="absolute left-[28%] top-[44%] flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-teal-600 text-sm font-black text-white shadow-xl">
                  1
                </div>
                <div className="absolute left-[62%] top-[32%] flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-sm font-black text-white shadow-xl">
                  2
                </div>
                <div className="absolute bottom-6 left-1/2 w-[82%] -translate-x-1/2 rounded-3xl bg-white p-4 shadow-xl">
                  <p className="text-xs font-black text-teal-700">地圖活動卡</p>
                  <h3 className="mt-1 text-base font-black">APM 親子工作坊</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    觀塘 · 今日 15:00 - 16:30
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/events/map"
              className="mt-5 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-700"
            >
              開啟附近活動地圖
            </Link>
          </div>

          <div className="rounded-[2rem] border border-purple-100 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-black text-purple-200">
              Merchant SaaS Preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              商戶可用智能匯入草稿，減少重複填表
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              已經有活動網頁、海報或 PDF？商戶可先建立草稿，再預覽及提交審批。
              HK Family Fun 現階段不代收活動款項，家長會直接連到商戶官方報名渠道。
            </p>

            <div className="mt-6 rounded-[1.5rem] bg-white p-4 text-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-purple-700">
                    Merchant Portal
                  </p>
                  <h3 className="mt-1 text-lg font-black">活動管理概覽</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  已啟用
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {["草稿 2", "審批中 3", "已發布 8"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">
                  智能匯入草稿
                </p>
                <h4 className="mt-1 text-sm font-black">
                  Summer Kids Market @ MegaBox
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  已自動建議：九龍灣 · 親子市集 · 免費入場
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/merchant-join"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-purple-700 hover:bg-purple-50"
              >
                了解商戶合作
              </Link>
              <Link
                href="/merchant/events/import"
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                試用智能匯入
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                想你的活動出現在 HK Family Fun？
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                商戶可先免費登記，上架首個活動，再按需要選擇單次刊登、代上架、月費方案或大型推廣合作。
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
                查看商戶方案
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
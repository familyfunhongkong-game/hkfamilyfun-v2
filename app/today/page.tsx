import Link from "next/link";

const todayEvents = [
  {
    time: "07:00",
    title: "香港公園｜清晨親子散步",
    venue: "香港公園",
    price: "免費",
    tags: ["戶外", "親子", "免費"],
  },
  {
    time: "09:00",
    title: "親子手作工作坊",
    venue: "觀塘商場",
    price: "HK$50",
    tags: ["室內", "手作", "親子"],
  },
  {
    time: "10:00",
    title: "兒童圖書館故事時間",
    venue: "公共圖書館",
    price: "免費",
    tags: ["閱讀", "免費", "室內"],
  },
  {
    time: "14:00",
    title: "STEAM 親子體驗活動",
    venue: "九龍灣",
    price: "HK$180",
    tags: ["STEAM", "教育", "親子"],
  },
  {
    time: "16:00",
    title: "商場親子打卡活動",
    venue: "尖沙咀",
    price: "免費",
    tags: ["商場", "打卡", "免費"],
  },
];

export default function TodayPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-blue-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white/80">今日活動</p>
              <h1 className="mt-2 text-4xl font-black">今日活動時間表</h1>
              <p className="mt-3 text-sm leading-7 text-white/85">
                快速查看今日適合家庭及小朋友參加的活動，按時間安排親子行程。
              </p>
            </div>

            <div className="rounded-3xl bg-white/15 px-6 py-5 text-center backdrop-blur">
              <p className="text-4xl font-black">{todayEvents.length}</p>
              <p className="mt-1 text-sm font-bold text-white/85">今日活動</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap gap-3">
          {["全部", "上午", "下午", "晚上", "免費活動"].map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {todayEvents.map((event) => (
            <article
              key={`${event.time}-${event.title}`}
              className="grid gap-4 border-b border-slate-100 p-5 last:border-b-0 md:grid-cols-[90px_1fr_auto]"
            >
              <div className="text-sm font-black text-slate-500">
                {event.time}
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {event.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{event.venue}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                  {event.price}
                </span>
                <Link
                  href="/events"
                  className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-800"
                >
                  查看
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">想睇更多活動？</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            你可以到活動日曆、搜尋活動或附近活動地圖，按日期、地區及港鐵站篩選。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/calendar"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              活動日曆
            </Link>
            <Link
              href="/events/map"
              className="rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-700"
            >
              附近活動地圖
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";

const calendarEvents = [
  {
    date: "7月28日",
    title: "Pixar Summer Fest 2026",
    venue: "海港城",
    price: "免費",
  },
  {
    date: "7月29日",
    title: "親子圖書館故事時間",
    venue: "香港公共圖書館",
    price: "免費",
  },
  {
    date: "7月30日",
    title: "STEAM 小小工程師",
    venue: "九龍灣",
    price: "HK$180",
  },
  {
    date: "8月1日",
    title: "夏日親子市集",
    venue: "沙田",
    price: "免費",
  },
];

const days = Array.from({ length: 31 }, (_, index) => index + 1);

export default function CalendarPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button className="rounded-full border border-slate-200 px-3 py-2 text-sm font-bold">
              ‹
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-purple-700">活動日曆</p>
              <h1 className="mt-1 text-2xl font-black">2026年7月</h1>
            </div>
            <button className="rounded-full border border-slate-200 px-3 py-2 text-sm font-bold">
              ›
            </button>
          </div>

          <div className="mb-5 text-center">
            <Link
              href="/today"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              今天
            </Link>
          </div>

          <div className="grid grid-cols-7 border-t border-l border-slate-100 text-center text-sm">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div
                key={day}
                className="border-r border-b border-slate-100 bg-slate-50 px-2 py-3 font-black text-slate-500"
              >
                {day}
              </div>
            ))}

            {days.map((day) => (
              <Link
                key={day}
                href="/events"
                className={`min-h-[72px] border-r border-b border-slate-100 p-2 hover:bg-purple-50 ${
                  day === 28 ? "bg-blue-50 ring-2 ring-blue-300" : "bg-white"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                    day === 28
                      ? "bg-blue-600 text-white"
                      : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {[1, 5, 8, 12, 15, 21, 28].includes(day) ? (
                  <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-purple-500" />
                ) : null}
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {["免費活動", "SEN友善", "戶外活動", "教育活動", "藝術創作"].map(
              (item) => (
                <Link
                  key={item}
                  href="/events"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-purple-300 hover:text-purple-700"
                >
                  {item}
                </Link>
              ),
            )}
          </div>
        </div>

        <section className="mt-8">
          <h2 className="border-l-4 border-purple-600 pl-3 text-xl font-black">
            2026年7月活動
          </h2>

          <div className="mt-5 space-y-4">
            {calendarEvents.map((event) => (
              <Link
                key={`${event.date}-${event.title}`}
                href="/events"
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-200 md:grid-cols-[90px_1fr_auto]"
              >
                <div className="rounded-2xl bg-orange-50 px-3 py-3 text-center text-sm font-black text-orange-700">
                  {event.date}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{event.venue}</p>
                </div>
                <span className="self-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {event.price}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
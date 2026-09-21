import Link from "next/link";

const examples = [
  "新開親子活動／工作坊",
  "免費或低收費社區活動",
  "商場／博物館／文化活動",
  "SEN 友善活動",
  "活動日期、價錢或連結需要更正",
  "你想 HK Family Fun 幫手搵的活動類型",
];

export default function TipsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">社區報料・家長願望池</p>
          <h1 className="mt-2 text-4xl font-black">有好活動？話俾 HK Family Fun 知</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">
            家長、商戶、學校、NGO 或社區機構都可以提供活動線索。
            我們會先核實官方資料，再決定是否加入公開活動列表。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-black text-emerald-700">活動報料</p>
          <h2 className="mt-2 text-2xl font-black">最好附官方來源</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            如果你見到值得分享的親子活動，請提供活動名稱及官方網站／主辦方帖文連結。
            未能核實來源的資料不會直接發布。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://wa.me/85257018297?text=你好，我想向 HK Family Fun 報料一個親子活動："
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
            >
              WhatsApp 報料
            </a>
            <a
              href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20活動報料"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              Email 報料
            </a>
          </div>
        </article>

        <article className="rounded-[2rem] border border-purple-200 bg-purple-50 p-7">
          <p className="text-sm font-black text-purple-700">家長願望池</p>
          <h2 className="mt-2 text-2xl font-black">想搵咩活動，可以直接提出</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            例如「今個週末新界免費活動」、「5歲 STEAM」、「SEN 友善室內活動」。
            這些需求會幫助平台決定之後優先整理哪些活動來源。
          </p>
          <a
            href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20家長願望池"
            className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
          >
            提交願望
          </a>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">可以報料什麼？</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {examples.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
              >
                ✓ {item}
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            HK Family Fun 會核實活動來源、日期及基本資料，但活動最終安排仍以主辦單位最新公布為準。
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              瀏覽活動
            </Link>
            <Link
              href="/merchant-join"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              商戶提交活動
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function TipsPage() {
  const locale = await getServerLocale();
  const m = getExtraPublicMessages(locale).tips;

  const whatsappText =
    locale === "en"
      ? "Hello, I would like to share a family event with HK Family Fun: "
      : locale === "zh-Hans"
        ? "你好，我想向 HK Family Fun 报料一个亲子活动："
        : "你好，我想向 HK Family Fun 報料一個親子活動：";

  const emailSubject =
    locale === "en"
      ? "HK Family Fun Event Tip"
      : locale === "zh-Hans"
        ? "HK Family Fun 活动报料"
        : "HK Family Fun 活動報料";

  const wishSubject =
    locale === "en"
      ? "HK Family Fun Parent Wish List"
      : locale === "zh-Hans"
        ? "HK Family Fun 家长愿望池"
        : "HK Family Fun 家長願望池";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">{m.kicker}</p>
          <h1 className="mt-2 text-4xl font-black">{m.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">
            {m.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-black text-emerald-700">{m.tipLabel}</p>
          <h2 className="mt-2 text-2xl font-black">{m.tipTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{m.tipDesc}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/85257018297?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
            >
              {m.whatsapp}
            </a>
            <a
              href={`mailto:info@hkfamilyfun.com?subject=${encodeURIComponent(emailSubject)}`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              {m.email}
            </a>
          </div>
        </article>

        <article className="rounded-[2rem] border border-purple-200 bg-purple-50 p-7">
          <p className="text-sm font-black text-purple-700">{m.wishLabel}</p>
          <h2 className="mt-2 text-2xl font-black">{m.wishTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{m.wishDesc}</p>
          <a
            href={`mailto:info@hkfamilyfun.com?subject=${encodeURIComponent(wishSubject)}`}
            className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
          >
            {m.wishSubmit}
          </a>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">{m.examplesTitle}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {m.examples.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
              >
                ✓ {item}
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            {m.disclaimer}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              {m.browse}
            </Link>
            <Link
              href="/merchant-join"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              {m.merchant}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

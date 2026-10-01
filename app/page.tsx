import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicMessages } from "@/lib/i18n/public-messages";

export const dynamic = "force-dynamic";



export default async function HomePage() {
  const locale = await getServerLocale();
  const p = getPublicMessages(locale);
  const events = await getPublishedEvents(locale);

  const quickActions = [
    { title: p.quickTodayTitle, subtitle: p.quickTodaySubtitle, href: "/today", tone: "bg-pink-50 border-pink-100 text-pink-700", icon: "⏰" },
    { title: p.quickCalendarTitle, subtitle: p.quickCalendarSubtitle, href: "/calendar", tone: "bg-blue-50 border-blue-100 text-blue-700", icon: "🗓️" },
    { title: p.quickMapTitle, subtitle: p.quickMapSubtitle, href: "/events/map", tone: "bg-teal-50 border-teal-100 text-teal-700", icon: "📍" },
  ];

  const categories = [
    { label: p.freeEvents, href: "/events?price=free", icon: "🎁" },
    { label: p.mallEvents, href: "/events?category=mall", icon: "🏬" },
    { label: p.workshops, href: "/events?category=workshop", icon: "🎨" },
    { label: p.senFriendly, href: "/events?sen=true", icon: "💛" },
    { label: p.indoorEvents, href: "/events?indoor=true", icon: "🏠" },
    { label: p.weekend, href: "/events?date=weekend", icon: "🌈" },
  ];
  const featured = events.filter((event) => event.featured);
  const upcoming = (featured.length ? featured : events).slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black text-purple-700">
              {p.homeKicker}
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {p.homeTitle1}
              <br />
              {p.homeTitle2}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              {p.homeIntro}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-purple-800"
              >
                {p.searchEvents}
              </Link>
              <Link
                href="/calendar"
                className="rounded-full border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700"
              >
                {p.openCalendar}
              </Link>
              <Link
                href="/merchant-join"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
              >
                {p.merchantJoin}
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

          <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-xl shadow-purple-100/60">
            <p className="text-sm font-black text-purple-700">{p.latestPublished}</p>
            <h2 className="mt-2 text-2xl font-black">
              {events.length ? p.activeEvents(events.length) : p.newEventsSoon}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {p.publishedOnly}
            </p>

            {events[0] ? (
              <Link
                href={`/events/${events[0].id}`}
                className="mt-5 block overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
              >
                <img
                  src={events[0].image}
                  alt={events[0].title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-56 w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-xs font-black text-purple-700">
                    {events[0].date} · {events[0].district}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {events[0].title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {events[0].organizer}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="font-black text-slate-800">{p.noPublicEvents}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {p.noDemoEvents}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">{p.quickExplore}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {p.exploreTitle}
            </h2>
          </div>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            {p.viewAll}
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
            <p className="text-sm font-black text-pink-700">{p.featured}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {p.upcoming}
            </h2>
          </div>
          <Link
            href="/calendar"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            {p.useCalendar}
          </Link>
        </div>

        {upcoming.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <img
                  src={event.image}
                  alt={event.title}
                  loading="lazy"
                  decoding="async"
                  className="h-48 w-full object-cover"
                />
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                      {event.date}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {event.price || p.officialDetails}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-950">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {event.organizer} · {event.district}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {p.emptyUpcoming}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-teal-700">{p.locationExplore}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {p.locationTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {p.locationDesc}
            </p>
            <Link
              href="/events/map"
              className="mt-5 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white"
            >
{p.openLocationExplore}
            </Link>
          </div>

          <div className="rounded-[2rem] border border-purple-100 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-black text-purple-200">{p.merchantPortalKicker}</p>
            <h2 className="mt-2 text-2xl font-black">
              {p.merchantPortalTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              {p.merchantPortalDesc}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["1", p.merchantStepDraft],
                ["2", p.merchantStepSubmit],
                ["3", p.merchantStepPublish],
              ].map(([step, label]) => (
                <div
                  key={step}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-center"
                >
                  <p className="text-xl font-black">{step}</p>
                  <p className="mt-1 text-xs font-bold text-white/80">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/merchant/register"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-purple-700"
              >
                {p.merchantRegisterFree}
              </Link>
              <Link
                href="/merchant/login"
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white"
              >
                {p.merchantLogin}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

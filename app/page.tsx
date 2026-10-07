import Link from "next/link";
import type { Event } from "@/lib/types";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicMessages } from "@/lib/i18n/public-messages";
import PromotionSlot from "@/components/promotion-slot";
import PublicEventCard from "@/components/events/PublicEventCard";
import {
  getActivePromotionBanners,
  type PublicPromotionBanner,
} from "@/lib/content/public";

export const dynamic = "force-dynamic";

function eventTimestamp(event: Event) {
  const value = event.updatedAt || event.publishedAt || event.date;
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const p = getPublicMessages(locale);

  const [events, homeTopBanners, homeMiddleBanners] = await Promise.all([
    getPublishedEvents(locale),
    getActivePromotionBanners("home_top", locale, 1),
    getActivePromotionBanners("home_middle", locale, 2),
  ]);

  const latestSorted = [...events].sort(
    (a, b) => eventTimestamp(b) - eventTimestamp(a),
  );

  const featuredEvents = latestSorted
    .filter((event) => event.featured)
    .slice(0, 4);

  const featuredGridClass =
    featuredEvents.length <= 1
      ? "grid gap-5 md:max-w-3xl"
      : featuredEvents.length === 2
        ? "grid gap-5 md:grid-cols-2"
        : featuredEvents.length === 3
          ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          : "grid gap-5 md:grid-cols-2 xl:grid-cols-4";

  const featuredIds = new Set(featuredEvents.map((event) => event.id));
  const latestUpdated = latestSorted
    .filter((event) => !featuredIds.has(event.id))
    .slice(0, 16);

  const quickActions = [
    {
      title: p.quickTodayTitle,
      subtitle: p.quickTodaySubtitle,
      href: "/today",
      tone: "bg-pink-50 border-pink-100 text-pink-700",
      icon: "⏰",
    },
    {
      title: p.quickCalendarTitle,
      subtitle: p.quickCalendarSubtitle,
      href: "/calendar",
      tone: "bg-blue-50 border-blue-100 text-blue-700",
      icon: "🗓️",
    },
    {
      title: p.quickMapTitle,
      subtitle: p.quickMapSubtitle,
      href: "/events/map",
      tone: "bg-teal-50 border-teal-100 text-teal-700",
      icon: "📍",
    },
  ];

  const categories = [
    { label: p.freeEvents, href: "/events?price=free", icon: "🎁" },
    { label: p.mallEvents, href: "/events?category=mall", icon: "🏬" },
    { label: p.workshops, href: "/events?category=workshop", icon: "🎨" },
    { label: p.senFriendly, href: "/events?sen=true", icon: "💛" },
    { label: p.indoorEvents, href: "/events?indoor=true", icon: "🏠" },
    { label: p.weekend, href: "/events?date=weekend", icon: "🌈" },
  ];

  const fallbackBanner: PublicPromotionBanner =
    locale === "en"
      ? {
          id: "home-house-fallback",
          placement: "home_top",
          headline: "Put your family event in front of Hong Kong parents",
          subheadline:
            "Merchant event submission, featured placement and campaign promotion are managed from one place.",
          imageUrl: "",
          mobileImageUrl: "",
          targetUrl: "/merchant-join",
          ctaLabel: "Merchant sign-up",
          badgeText: "HK Family Fun",
          sponsorName: "HK Family Fun",
          isPaid: false,
        }
      : locale === "zh-Hans"
        ? {
            id: "home-house-fallback",
            placement: "home_top",
            headline: "让更多香港家长看到你的亲子活动",
            subheadline: "商户投稿、精选曝光及推广活动都可以由 HK Family Fun 统一管理。",
            imageUrl: "",
            mobileImageUrl: "",
            targetUrl: "/merchant-join",
            ctaLabel: "商户免费登记",
            badgeText: "HK Family Fun",
            sponsorName: "HK Family Fun",
            isPaid: false,
          }
        : {
            id: "home-house-fallback",
            placement: "home_top",
            headline: "讓更多香港家長看到你的親子活動",
            subheadline: "商戶投稿、精選曝光及推廣活動都可以由 HK Family Fun 統一管理。",
            imageUrl: "",
            mobileImageUrl: "",
            targetUrl: "/merchant-join",
            ctaLabel: "商戶免費登記",
            badgeText: "HK Family Fun",
            sponsorName: "HK Family Fun",
            isPaid: false,
          };

  const topBanners = homeTopBanners.length
    ? homeTopBanners
    : [fallbackBanner];

  const labels =
    locale === "en"
      ? {
          featuredKicker: "HK Family Fun Picks",
          featuredTitle: "Featured family events",
          featuredEmpty: "Featured events will appear here after Admin selection.",
          latestKicker: "Freshly updated",
          latestTitle: "Latest event updates",
          latestDesc:
            "Recently updated published events are shown first, so families can spot new information quickly.",
          latestEmpty: "No additional published events are available yet.",
        }
      : locale === "zh-Hans"
        ? {
            featuredKicker: "HK Family Fun 精选",
            featuredTitle: "精选推介活动",
            featuredEmpty: "Admin 设定精选活动后会显示在这里。",
            latestKicker: "最新更新",
            latestTitle: "最新活动",
            latestDesc: "按最近更新时间由新至旧排列，方便最快看到新活动及资料更新。",
            latestEmpty: "暂时没有其他已发布活动。",
          }
        : {
            featuredKicker: "HK Family Fun 精選",
            featuredTitle: "精選推介活動",
            featuredEmpty: "Admin 設定精選活動後會顯示在這裡。",
            latestKicker: "最新更新",
            latestTitle: "最新活動",
            latestDesc: "按最近更新時間由新至舊排列，方便最快看到新活動及資料更新。",
            latestEmpty: "暫時沒有其他已發布活動。",
          };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      {/* Highest-priority homepage inventory: Admin-managed horizontal ad banner. */}
      <div className="border-b border-slate-100 bg-white">
        <PromotionSlot banners={topBanners} variant="horizontal" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">
              {labels.featuredKicker}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {labels.featuredTitle}
            </h1>
          </div>

          <Link
            href="/events"
            className="rounded-full border border-purple-200 bg-white px-5 py-3 text-sm font-black text-purple-700 hover:bg-purple-50"
          >
            {p.viewAll}
          </Link>
        </div>

        {featuredEvents.length ? (
          <div className={featuredGridClass}>
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                locale={locale}
                featured
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            {labels.featuredEmpty}
          </div>
        )}
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-emerald-700">
                {labels.latestKicker}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {labels.latestTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {labels.latestDesc}
              </p>
            </div>

            <Link
              href="/events"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              {p.viewAll}
            </Link>
          </div>

          {latestUpdated.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {latestUpdated.map((event) => (
                <PublicEventCard key={event.id} event={event} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              {labels.latestEmpty}
            </div>
          )}
        </div>
      </section>

      <PromotionSlot banners={homeMiddleBanners} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
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
            <p className="text-sm font-black text-purple-200">
              {p.merchantPortalKicker}
            </p>
            <h2 className="mt-2 text-2xl font-black">{p.merchantPortalTitle}</h2>
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

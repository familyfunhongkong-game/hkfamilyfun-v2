import Link from "next/link";

import { EventGrid } from "@/components/events/EventGrid";
import { CategoryChips } from "@/components/home/CategoryChips";
import { MerchantCTA } from "@/components/home/MerchantCTA";
import { SearchFilterPanel } from "@/components/home/SearchFilterPanel";
import { SectionHeader } from "@/components/home/SectionHeader";
import { getPublishedEvents } from "@/lib/supabase/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allEvents = await getPublishedEvents();

  const featuredEvents = allEvents
    .filter((event) => event.featured)
    .slice(0, 6);

  const freeEvents = allEvents
    .filter((event) => event.priceType === "free")
    .slice(0, 6);

  const senEvents = allEvents
    .filter((event) => event.senFriendly)
    .slice(0, 6);

  return (
    <main>
      <section className="border-b border-slate-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
              香港親子活動一站式搜尋平台
            </p>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              發掘香港最棒的
              <span className="ml-2 text-violet-600">親子活動</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              從免費活動、商場體驗、工作坊到 SEN 友善活動，
              快速找到適合你和小朋友的親子好去處。
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/events"
                className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-violet-700"
              >
                搜尋活動
              </Link>

              <Link
                href="/merchant-join"
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
              >
                商戶免費登記
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/events"
            className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
          >
            <div className="text-2xl">🗓️</div>
            <p className="mt-2 font-bold text-slate-900">今日活動</p>
          </Link>

          <Link
            href="/events"
            className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
          >
            <div className="text-2xl">🎉</div>
            <p className="mt-2 font-bold text-slate-900">今個週末</p>
          </Link>

          <Link
            href="/events?priceType=free"
            className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
          >
            <div className="text-2xl">🎁</div>
            <p className="mt-2 font-bold text-slate-900">免費活動</p>
          </Link>

          <Link
            href="/events?sen=true"
            className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
          >
            <div className="text-2xl">💙</div>
            <p className="mt-2 font-bold text-slate-900">SEN 友善</p>
          </Link>
        </section>

        <SearchFilterPanel />

        <CategoryChips />

        <section>
          <SectionHeader
            title="精選活動"
            subtitle="為家庭精心挑選的熱門親子體驗"
            href="/events"
          />
          <EventGrid events={featuredEvents} />
        </section>

        <section>
          <SectionHeader
            title="免費活動"
            subtitle="零成本也能玩得開心"
            href="/events?priceType=free"
          />
          <EventGrid events={freeEvents} />
        </section>

        <section>
          <SectionHeader
            title="SEN 友善活動"
            subtitle="Inclusive 設計，讓每個孩子都能參與"
            href="/events?sen=true"
          />
          <EventGrid events={senEvents} />
        </section>

        <MerchantCTA />
      </div>
    </main>
  );
}
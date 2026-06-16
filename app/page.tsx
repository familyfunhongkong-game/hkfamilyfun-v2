import { CategoryChips } from "@/components/home/CategoryChips";
import { Hero } from "@/components/home/Hero";
import { MerchantCTA } from "@/components/home/MerchantCTA";
import { QuickButtons } from "@/components/home/QuickButtons";
import { SearchFilterPanel } from "@/components/home/SearchFilterPanel";
import { EventGrid } from "@/components/events/EventGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  getFeaturedEvents,
  getFreeEvents,
  getSenFriendlyEvents,
} from "@/lib/mock-events";

export default function HomePage() {
  const featuredEvents = getFeaturedEvents();
  const freeEvents = getFreeEvents().slice(0, 3);
  const senEvents = getSenFriendlyEvents().slice(0, 3);

  return (
    <>
      <Hero />

      <div className="-mt-6 space-y-12 pb-16 pt-6">
        <QuickButtons />

        <SearchFilterPanel />

        <CategoryChips />

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="精選活動"
            subtitle="為家庭精心挑選的熱門親子體驗"
            href="/events"
          />
          <EventGrid events={featuredEvents} />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="免費活動"
            subtitle="零成本也能玩得開心"
            href="/events?priceType=free"
          />
          <EventGrid events={freeEvents} />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="SEN 友善活動"
            subtitle="Inclusive 設計，讓每個孩子都能參與"
            href="/events?sen=true"
          />
          <EventGrid events={senEvents} />
        </section>

        <MerchantCTA />
      </div>
    </>
  );
}

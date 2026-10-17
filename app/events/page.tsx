import type { Metadata } from "next";
import PublicEventsSearchClient from "@/components/events/PublicEventsSearchClient";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicEventRecords } from "@/lib/events/public-event-records";

export const metadata: Metadata = {
  title: "搜尋香港親子活動｜日期、地區、年齡及免費活動",
  description: "搜尋香港最新親子活動、兒童工作坊及免費好去處，按日期、地區、年齡、收費及活動類型篩選。",
  alternates: { canonical: "/events" },
};

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const [initialLocale, initialEvents] = await Promise.all([
    getServerLocale(),
    getPublicEventRecords(),
  ]);

  return (
    <PublicEventsSearchClient
      initialLocale={initialLocale}
      initialEvents={initialEvents}
    />
  );
}

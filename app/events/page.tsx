import PublicEventsSearchClient from "@/components/events/PublicEventsSearchClient";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicEventRecords } from "@/lib/events/public-event-records";

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

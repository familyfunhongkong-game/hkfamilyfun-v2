import type { Metadata } from "next";
import { getPublishedEventById } from "@/lib/supabase/events";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await getPublishedEventById(params.id);

  if (!event) {
    return {
      title: "活動資料",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const description =
    event.shortDescription ||
    `${event.organizer} 主辦的香港親子活動。日期：${event.date}；地區：${event.district}。`;

  return {
    title: event.title,
    description,
    alternates: {
      canonical: `/events/${event.id}`,
    },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: `/events/${event.id}`,
      images: event.image ? [{ url: event.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.image ? [event.image] : undefined,
    },
  };
}

export default function EventDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  buildEventJsonLd,
  canonicalEventUrl,
  getEventSeoData,
  getEventSeoDescription,
  getEventSeoImage,
  getEventSeoTitle,
  isEventExpired,
  serializeJsonLd,
} from "@/lib/seo/event-seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function isCanonicalHost(host: string) {
  const normalized = host.toLowerCase().split(":")[0];
  return normalized === "hkfamilyfun.com" || normalized === "www.hkfamilyfun.com";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventSeoData(id);
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "";

  if (!event) {
    return {
      title: "活動資料",
      description: "此活動目前未能公開顯示。",
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    };
  }

  const title = getEventSeoTitle(event);
  const description = getEventSeoDescription(event);
  const image = getEventSeoImage(event);
  const canonical = canonicalEventUrl(event.id);
  const canIndex = isCanonicalHost(host) && !isEventExpired(event);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "zh_HK",
      siteName: "HK Family Fun",
      url: canonical,
      title: `${title}｜HK Family Fun`,
      description,
      images: [
        {
          url: image,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜HK Family Fun`,
      description,
      images: [image],
    },
    robots: {
      index: canIndex,
      follow: canIndex,
      googleBot: {
        index: canIndex,
        follow: canIndex,
      },
    },
  };
}

export default async function EventDetailLayout({ children, params }: Props) {
  const { id } = await params;
  const event = await getEventSeoData(id);
  const jsonLd = event ? buildEventJsonLd(event) : null;

  return (
    <>
      {jsonLd ? (
        <script
          id="event-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}

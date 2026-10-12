"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const EVENT_PATH = /^\/events\/([0-9a-f-]{36})$/i;

function getOrCreate(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

function deviceType() {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function referrerHostname() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname || null;
  } catch {
    return null;
  }
}

function sendAnalytics(
  eventType: "page_view" | "event_view" | "cta_click",
  pagePath: string,
  eventId: string | null,
) {
  if (
    pagePath === "/maintenance" ||
    pagePath.startsWith("/admin") ||
    pagePath.startsWith("/merchant") ||
    pagePath.startsWith("/api")
  ) {
    return;
  }

  try {
    const payload = JSON.stringify({
      visitorId: getOrCreate(localStorage, "hkff_visitor_id"),
      sessionId: getOrCreate(sessionStorage, "hkff_session_id"),
      eventType,
      pagePath,
      eventId,
      referrerHostname: referrerHostname(),
      deviceType: deviceType(),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Analytics must never block navigation or public UX.
  }
}

export default function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const pagePath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const eventMatch = pathname.match(EVENT_PATH);
    const eventId = eventMatch?.[1] || null;

    sendAnalytics("page_view", pagePath, eventId);
    if (eventId) {
      sendAnalytics("event_view", pagePath, eventId);
    }

    function handleClick(event: MouseEvent) {
      if (!eventId) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("/") || href.startsWith("#")) return;
      sendAnalytics("cta_click", pagePath, eventId);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, searchParams]);

  return null;
}

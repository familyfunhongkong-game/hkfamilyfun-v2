"use client";

import { useEffect, type ReactNode } from "react";

function sendPromotionEvent(
  bannerId: string,
  placement: string,
  eventType: "impression" | "click",
) {
  const payload = JSON.stringify({
    banner_id: bannerId,
    placement,
    event_type: eventType,
    page_path: window.location.pathname,
  });

  void fetch("/api/promotion-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never affect navigation or page rendering.
  });
}

export default function PromotionTracker({
  bannerId,
  placement,
  trackClick = false,
  className = "",
  children,
}: {
  bannerId: string;
  placement: string;
  trackClick?: boolean;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (bannerId.startsWith("home-house-fallback")) return;

    const key =
      "hkff:promo:impression:" +
      bannerId +
      ":" +
      placement +
      ":" +
      window.location.pathname;

    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // If storage is unavailable, record one best-effort impression.
    }

    sendPromotionEvent(bannerId, placement, "impression");
  }, [bannerId, placement]);

  return (
    <div
      className={className}
      onClick={
        trackClick && !bannerId.startsWith("home-house-fallback")
          ? () => sendPromotionEvent(bannerId, placement, "click")
          : undefined
      }
    >
      {children}
    </div>
  );
}

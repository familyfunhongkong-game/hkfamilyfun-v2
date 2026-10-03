"use client";

import { useState, type CSSProperties } from "react";
import EventImageFallback from "@/components/event-image-fallback";

export default function ResilientEventImage({
  src,
  alt,
  className,
  style,
  loading = "lazy",
  fetchPriority,
  compactFallback = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  compactFallback?: boolean;
}) {
  const normalizedSrc = String(src || "").trim();
  const [failedSrc, setFailedSrc] = useState("");

  if (!normalizedSrc || failedSrc === normalizedSrc) {
    return <EventImageFallback compact={compactFallback} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <EventImageFallback compact={compactFallback} />
      </div>
      <img
        src={normalizedSrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={["relative z-10", className || ""].join(" ")}
        style={style}
        onError={() => setFailedSrc(normalizedSrc)}
      />
    </div>
  );
}

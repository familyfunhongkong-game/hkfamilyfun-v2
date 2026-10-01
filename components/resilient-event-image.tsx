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
    <img
      src={normalizedSrc}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}

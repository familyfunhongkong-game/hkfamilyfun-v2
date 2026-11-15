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
  // Only images deliberately saved under the approved AI-cover namespaces are
  // labelled AI. Never infer AI origin for an external organiser photo.
  const aiIllustration = /^\/images\/ai-event-covers\/[^?#]+/i.test(normalizedSrc)
    || /\/storage\/v1\/object\/public\/hkff-ai-event-covers\//i.test(normalizedSrc);
  const [failedSrc, setFailedSrc] = useState("");
  const [loadedSrc, setLoadedSrc] = useState("");
  const imageFailed = !normalizedSrc || failedSrc === normalizedSrc;
  const imageLoaded = !imageFailed && loadedSrc === normalizedSrc;

  if (imageFailed) {
    return <EventImageFallback compact={compactFallback} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <EventImageFallback compact={compactFallback} />
      </div>
      <img
        key={normalizedSrc}
        src={normalizedSrc}
        alt={imageLoaded ? alt : ""}
        aria-hidden={!imageLoaded}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={[
          "relative z-10 transition-opacity duration-150",
          imageLoaded ? "opacity-100" : "opacity-0",
          className || "",
        ].join(" ")}
        style={style}
        onLoad={() => setLoadedSrc(normalizedSrc)}
        onError={() => setFailedSrc(normalizedSrc)}
      />
      {aiIllustration && imageLoaded ? (
        <span role="note" data-testid="ai-event-cover-disclosure" className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md bg-slate-950/90 px-2.5 py-1 text-[11px] font-extrabold leading-4 text-white shadow-sm">
          AI 示意圖 · 非活動實景
        </span>
      ) : null}
    </div>
  );
}

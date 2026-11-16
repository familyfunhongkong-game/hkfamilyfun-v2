"use client";

import { useState, type CSSProperties } from "react";
import EventImageFallback from "@/components/event-image-fallback";

const PHOTO_PREFIX = "/images/realistic-event-covers/";
const ORIGINAL_AI_PREFIX = "/images/ai-event-covers/";
const GENERIC_COVER = "/images/verified-event-placeholder.svg";

function photoTheme(category?: string | null) {
  const value = String(category || "").toLowerCase();
  if (/科學|太空|天文|science|stem|科技|實驗/.test(value)) return "science";
  if (/表演|舞蹈|音樂|劇場|ballet|performance|theatre|concert/.test(value)) return "performance";
  if (/文化|歷史|博物館|museum|heritage|故宮|展覽/.test(value)) return "culture";
  if (/自然|戶外|公園|行山|生態|nature|outdoor|park/.test(value)) return "nature";
  if (/藝術|美術|手工|繪畫|art|craft|creative/.test(value)) return "arts";
  return "festive";
}

function shouldUsePhotoFallback(src: string) {
  return !src
    || src === GENERIC_COVER
    || src.startsWith(ORIGINAL_AI_PREFIX)
    || /^https:\/\/placehold\.co\//i.test(src);
}

export default function ResilientEventImage({
  src,
  alt,
  category,
  className,
  style,
  loading = "lazy",
  fetchPriority,
  compactFallback = false,
}: {
  src?: string | null;
  alt: string;
  /** Broad category only: never imply a generated scene depicts the real event. */
  category?: string | null;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  compactFallback?: boolean;
}) {
  const originalSrc = String(src || "").trim();
  // This opt-in is activated only AFTER all six first-party photo files are
  // deployed to the same environment. It never replaces licensed organiser photos.
  const photoSrc = process.env.NEXT_PUBLIC_HKFF_REALISTIC_COVERS === "true"
    && shouldUsePhotoFallback(originalSrc)
    ? `${PHOTO_PREFIX}hkff-${photoTheme(category)}-photorealistic.webp`
    : "";
  const [failedSrc, setFailedSrc] = useState("");
  const [loadedSrc, setLoadedSrc] = useState("");
  const normalizedSrc = photoSrc && failedSrc !== photoSrc ? photoSrc : originalSrc;
  const imageFailed = !normalizedSrc || failedSrc === normalizedSrc;
  const imageLoaded = !imageFailed && loadedSrc === normalizedSrc;
  // All first-party realistic covers are synthetic, despite photographic style.
  const aiIllustration = normalizedSrc.startsWith(PHOTO_PREFIX)
    || normalizedSrc.startsWith(ORIGINAL_AI_PREFIX)
    || /\/storage\/v1\/object\/public\/hkff-ai-event-covers\//i.test(normalizedSrc);

  if (imageFailed) return <EventImageFallback compact={compactFallback} />;

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

"use client";

import { useState } from "react";

type SafeEventImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export default function SafeEventImage({
  src,
  alt,
  className = "",
}: SafeEventImageProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = !failed && src ? src : "/familyfun-logo-original.png";

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={[
        className,
        failed || !src ? "bg-[#ece1cf] object-contain p-4" : "",
      ].join(" ")}
      onError={() => setFailed(true)}
    />
  );
}

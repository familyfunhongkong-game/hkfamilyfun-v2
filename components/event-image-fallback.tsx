import Image from "next/image";

export default function EventImageFallback({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-amber-50 px-6 text-center"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(124,58,237,.12) 0 2px, transparent 2px), radial-gradient(circle at 80% 35%, rgba(13,148,136,.10) 0 2px, transparent 2px), radial-gradient(circle at 55% 80%, rgba(245,158,11,.12) 0 2px, transparent 2px)",
          backgroundSize: "34px 34px, 42px 42px, 38px 38px",
        }}
      />

      <div className="relative flex flex-col items-center">
        <div
          className={[
            "grid place-items-center rounded-[1.6rem] border border-white/80 bg-white/90 shadow-lg shadow-violet-100/70 backdrop-blur",
            compact ? "h-16 w-16 p-2.5" : "h-24 w-24 p-4",
          ].join(" ")}
        >
          <Image
            src="/api/brand/family-fun-logo"
            alt=""
            width={160}
            height={160}
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>

        <p
          className={[
            "font-black tracking-tight text-slate-900",
            compact ? "mt-3 text-sm" : "mt-4 text-lg",
          ].join(" ")}
        >
          HK Family Fun
        </p>
        <p
          className={[
            "font-semibold tracking-wide text-slate-500",
            compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs",
          ].join(" ")}
        >
          Plan Less, Play More.
        </p>
      </div>
    </div>
  );
}

import Image from "next/image";
import { CalendarDays } from "lucide-react";

export default function EventImageFallback({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    // Small thumbnails must never contain the long brand tagline or event title:
    // the /today view displays these at only ~80-92px high.
    return (
      <div
        aria-hidden="true"
        className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50 p-1.5 text-center"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-200 bg-white/85 text-violet-700 shadow-sm">
          <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <span className="block max-w-full truncate text-[9px] font-extrabold tracking-wide text-violet-800">
          HK FAMILY FUN
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 text-center"
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
        <div className="grid h-24 w-24 place-items-center rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-lg shadow-violet-100/70 backdrop-blur">
          <Image
            src="/api/brand/family-fun-logo"
            alt=""
            width={160}
            height={160}
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-4 font-black tracking-tight text-lg text-slate-900">
          HK Family Fun
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">
          Plan Less, Play More.
        </p>
      </div>
    </div>
  );
}

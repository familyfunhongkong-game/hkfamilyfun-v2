import Link from "next/link";

type PromoBannerSlotProps = {
  compact?: boolean;
};

export default function PromoBannerSlot({
  compact = false,
}: PromoBannerSlotProps) {
  return (
    <aside
      aria-label="HK Family Fun 合作推廣位置"
      className={[
        "overflow-hidden rounded-[1.6rem] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-purple-50 shadow-sm",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
              Partner
            </span>
            <span className="text-xs font-black text-amber-800">合作推廣位置</span>
          </div>
          <p className={["mt-2 font-black tracking-tight text-slate-950", compact ? "text-base" : "text-lg sm:text-xl"].join(" ")}>
            親子品牌／活動主辦：想俾更多香港家長見到？
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
            Banner、精選活動及品牌合作位置。所有推廣內容會清楚標示，並需經 HK Family Fun 審批。
          </p>
        </div>
        <Link
          href="/merchant/register"
          className="shrink-0 rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-purple-700"
        >
          商戶合作 →
        </Link>
      </div>
    </aside>
  );
}

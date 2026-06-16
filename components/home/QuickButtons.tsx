import Link from "next/link";
import { QUICK_FILTERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const paramMap: Record<string, string> = {
  today: "date=today",
  weekend: "date=weekend",
  free: "priceType=free",
  sen: "sen=true",
};

export function QuickButtons() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_FILTERS.map((filter, index) => (
          <Link
            key={filter.param}
            href={`/events?${paramMap[filter.param]}`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center card-shadow transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md",
              index === 0 && "bg-gradient-to-br from-primary-50 to-white",
              index === 3 && "bg-gradient-to-br from-blue-50 to-white"
            )}
          >
            <span className="text-2xl">{filter.icon}</span>
            <span className="text-sm font-semibold text-gray-800">
              {filter.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

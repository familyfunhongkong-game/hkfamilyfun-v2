import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { getTagColor } from "@/lib/utils";

export function CategoryChips() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-lg font-bold text-gray-900">熱門類別</h2>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category, index) => (
          <Link
            key={category}
            href={`/events?category=${encodeURIComponent(category)}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-80 ${getTagColor(index)}`}
          >
            {category}
          </Link>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";

const lifestyleCards = [
  {
    label: "週末市集",
    sub: "行下市集 · 親子放電",
    href: "/events?category=market",
    image:
      "https://images.unsplash.com/photo-1745847800340-24e5aa5c28ff?auto=format&fit=crop&q=82&w=1200",
  },
  {
    label: "博物館",
    sub: "落雨都玩到 · 邊玩邊學",
    href: "/events?category=exhibition",
    image:
      "https://images.unsplash.com/photo-1763696118771-b1b35552bfc2?auto=format&fit=crop&q=82&w=1200",
  },
  {
    label: "香港小旅行",
    sub: "搭船 · 海旁 · 城市探索",
    href: "/events?category=outdoor",
    image:
      "https://images.unsplash.com/photo-1775119222921-641a304ef582?auto=format&fit=crop&q=82&w=1200",
  },
  {
    label: "一家去食",
    sub: "親子食店 · 美食體驗",
    href: "/events?category=cooking",
    image:
      "https://images.unsplash.com/photo-1605016896945-719f1c79c9f6?auto=format&fit=crop&q=82&w=1200",
  },
];

export default function FamilyFunMotionHero() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lifestyleCards.map((card, index) => (
        <Link
          key={card.label}
          href={card.href}
          className={[
            "group relative overflow-hidden rounded-[1.6rem] bg-slate-200 shadow-sm ring-1 ring-black/5",
            index === 0 ? "sm:row-span-2 sm:min-h-[430px]" : "min-h-[205px]",
          ].join(" ")}
        >
          <img
            src={card.image}
            alt={card.label}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs font-bold text-white/80">{card.sub}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                {card.label}
              </h2>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/95 text-base font-black text-slate-950 transition group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: string;
};

export default function MobileBottomNav({\n  items,\n  ariaLabel,\n}: {\n  items: Item[];\n  ariaLabel: string;\n}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 shadow-[0_-10px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-black transition",
                active
                  ? "text-purple-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {active ? (
                <span className="absolute top-0 h-1 w-7 rounded-full bg-purple-600" />
              ) : null}
              <span className="text-xl leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

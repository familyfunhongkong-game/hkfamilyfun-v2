import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
}

export function SectionHeader({
  title,
  subtitle,
  href,
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="text-sm font-bold text-violet-600 transition hover:text-violet-800"
        >
          查看全部 →
        </Link>
      ) : null}
    </div>
  );
}

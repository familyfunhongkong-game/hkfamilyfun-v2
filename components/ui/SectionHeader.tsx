import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "查看全部",
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

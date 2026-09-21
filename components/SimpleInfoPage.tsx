import type { ReactNode } from "react";
import Link from "next/link";

export function SimpleInfoPage({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {eyebrow ? (
            <p className="text-sm font-black text-purple-700">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {subtitle}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-7 text-sm leading-7 text-slate-700">
            {children}
          </div>

          <div className="mt-10 border-t border-slate-100 pt-6">
            <Link
              href="/"
              className="text-sm font-black text-purple-700 hover:text-purple-900"
            >
              ← 返回 HK Family Fun
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

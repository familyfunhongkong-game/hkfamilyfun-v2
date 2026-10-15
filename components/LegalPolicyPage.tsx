import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import type { LegalTranslations } from "@/lib/legal/types";

const links = [
  { href: "/privacy", tc: "私隱政策", sc: "隐私政策", en: "Privacy Policy" },
  { href: "/terms", tc: "服務條款", sc: "服务条款", en: "Terms of Service" },
  { href: "/merchant-terms", tc: "商戶條款", sc: "商户条款", en: "Merchant Terms" },
  { href: "/disclaimer", tc: "免責聲明", sc: "免责声明", en: "Disclaimer" },
  { href: "/data-deletion", tc: "資料刪除指引", sc: "数据删除指引", en: "Data Deletion" },
];

export default async function LegalPolicyPage({ translations }: { translations: LegalTranslations }) {
  const locale = await getServerLocale();
  const c = translations[locale];
  const operator = locale === "en" ? "Operated by Peyto Dev Hub Limited" :
    locale === "zh-Hans" ? "营运方：Peyto Dev Hub Limited" : "營運方：Peyto Dev Hub Limited";
  const revised = locale === "en" ? "Last updated" : locale === "zh-Hans" ? "更新日期" : "更新日期";
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-purple-700">{c.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{c.lead}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
          <span>{operator}</span><span>{revised}: {c.updated}</span>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="space-y-9">
          {c.sections.map((section, idx) => <section key={idx} aria-labelledby={`legal-section-${idx}`}>
            <h2 id={`legal-section-${idx}`} className="text-lg font-extrabold text-slate-950">{idx + 1}. {section.heading}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              {section.paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
            </div>
          </section>)}
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-bold">{locale === "en" ? "Related legal information" : locale === "zh-Hans" ? "相关法律文件" : "相關法律文件"}</h2>
          <nav className="mt-3 flex flex-wrap gap-2">
            {links.map(item => <Link key={item.href} href={item.href}
              className="rounded-full border border-purple-200 px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-50">
              {locale === "en" ? item.en : locale === "zh-Hans" ? item.sc : item.tc}
            </Link>)}
          </nav>
          <p className="mt-5 text-xs text-slate-500">
            {locale === "en" ? "For questions, contact info@hkfamilyfun.com." :
              locale === "zh-Hans" ? "如有疑问，请电邮 info@hkfamilyfun.com。" :
              "如有疑問，請電郵 info@hkfamilyfun.com。"}
          </p>
        </div>
      </article>
    </div>
  </main>;
}

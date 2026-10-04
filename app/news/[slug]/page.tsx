import Link from "next/link";
import { notFound } from "next/navigation";
import PromotionSlot from "@/components/promotion-slot";
import { getActivePromotionBanners, getPublishedArticleBySlug } from "@/lib/content/public";
import { getServerLocale } from "@/lib/i18n/server";
import { uiText } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const article = await getPublishedArticleBySlug(slug, locale);

  if (!article) notFound();

  const banners = await getActivePromotionBanners("article_inline", locale, 1);

  return (
    <main className="min-h-screen bg-white">
      <article>
        <header className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
          <Link href="/news" className="text-sm font-black text-purple-700">
            ← {uiText(locale, "親子情報", "亲子资讯", "News & Features")}
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-800">
              {article.articleType}
            </span>
            {article.isSponsored ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                Sponsored
              </span>
            ) : null}
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
            {article.title}
          </h1>
          {article.excerpt ? (
            <p className="mt-5 text-lg leading-8 text-slate-600">{article.excerpt}</p>
          ) : null}
          {article.sponsorName ? (
            <p className="mt-4 text-xs font-bold text-slate-400">
              {article.isSponsored ? "Partner / Sponsor: " : "Source: "}
              {article.sponsorName}
            </p>
          ) : null}
        </header>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] bg-slate-100">
            <img
              src={article.coverImageUrl || "/logo.png"}
              alt={article.title}
              className="max-h-[720px] w-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="space-y-6 text-[17px] leading-8 text-slate-700">
            {paragraphs(article.body || article.excerpt).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {article.galleryImageUrls.length ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {article.galleryImageUrls.map((url, index) => (
                <img
                  key={url + index}
                  src={url}
                  alt={article.title + " " + (index + 1)}
                  loading="lazy"
                  className="w-full rounded-3xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          ) : null}

          {article.sourceUrl ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Official / source link
              </p>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-black text-purple-700"
              >
                {uiText(locale, "查看原始資料 →", "查看原始资料 →", "Open source →")}
              </a>
            </div>
          ) : null}
        </div>
      </article>

      <PromotionSlot banners={banners} />
    </main>
  );
}

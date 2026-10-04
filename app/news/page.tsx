import Link from "next/link";
import PromotionSlot from "@/components/promotion-slot";
import { getActivePromotionBanners, getPublishedArticles } from "@/lib/content/public";
import { getServerLocale } from "@/lib/i18n/server";
import { uiText } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const locale = await getServerLocale();
  const [articles, banners] = await Promise.all([
    getPublishedArticles(locale, 30),
    getActivePromotionBanners("news_top", locale, 2),
  ]);

  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-purple-700">
            HK Family Fun Editorial
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {uiText(locale, "親子情報・活動專題", "亲子资讯・活动专题", "Family News & Features")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {uiText(
                  locale,
                  "除咗活動列表，呢度會用完整圖片、重點整理同實用資料深入介紹值得留意嘅親子活動、展覽、商場企劃同家庭生活資訊。",
                  "除了活动列表，这里会用完整图片、重点整理和实用资料深入介绍值得留意的亲子活动、展览、商场企划和家庭生活资讯。",
                  "Image-led editorial coverage of notable family events, exhibitions, campaigns and practical family information in Hong Kong.",
                )}
              </p>
            </div>
            <Link
              href="/events"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              {uiText(locale, "返回活動搜尋", "返回活动搜索", "Back to Events")}
            </Link>
          </div>
        </div>
      </section>

      <PromotionSlot banners={banners} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!lead ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-xl font-black text-slate-900">
              {uiText(locale, "News / Feature 正在準備中", "News / Feature 正在准备中", "News & Features are being prepared")}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {uiText(
                locale,
                "Admin 發布第一篇文章後，呢版就會自動顯示。",
                "Admin 发布第一篇文章后，这一页会自动显示。",
                "This page will populate automatically after the first article is published in Admin.",
              )}
            </p>
          </div>
        ) : (
          <>
            <Link
              href={"/news/" + lead.slug}
              className="group grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="min-h-72 bg-slate-100 lg:min-h-[460px]">
                <img
                  src={lead.coverImageUrl || "/logo.png"}
                  alt={lead.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  loading="eager"
                />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                    {lead.articleType === "feature" ? "FEATURE" : lead.articleType.toUpperCase()}
                  </span>
                  {lead.isSponsored ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                      Sponsored
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                  {lead.title}
                </h2>
                {lead.excerpt ? (
                  <p className="mt-4 text-base leading-8 text-slate-600">{lead.excerpt}</p>
                ) : null}
                <p className="mt-6 text-sm font-black text-purple-700">
                  {uiText(locale, "閱讀全文 →", "阅读全文 →", "Read full story →")}
                </p>
              </div>
            </Link>

            {rest.length ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <Link
                    key={article.id}
                    href={"/news/" + article.slug}
                    className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={article.coverImageUrl || "/logo.png"}
                        alt={article.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                          {article.articleType}
                        </span>
                        {article.isSponsored ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
                            Sponsored
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 text-xl font-black leading-snug text-slate-950">
                        {article.title}
                      </h2>
                      {article.excerpt ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {article.excerpt}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

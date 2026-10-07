import { supabase } from "@/lib/supabase/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";
import { canShowPromotion } from "@/lib/business-model";

export type PromotionPlacement =
  | "home_top"
  | "home_middle"
  | "events_top"
  | "news_top"
  | "article_inline";

export type PublicPromotionBanner = {
  id: string;
  placement: PromotionPlacement;
  headline: string;
  subheadline: string;
  imageUrl: string;
  mobileImageUrl: string;
  targetUrl: string;
  ctaLabel: string;
  badgeText: string;
  sponsorName: string;
  isPaid: boolean;
};

export type PublicArticle = {
  id: string;
  slug: string;
  articleType: "news" | "feature" | "guide" | "sponsored";
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  sourceUrl: string;
  sponsorName: string;
  isSponsored: boolean;
  featured: boolean;
  publishedAt: string | null;
};

type PromotionRow = {
  id: string;
  placement: PromotionPlacement;
  headline_tc: string | null;
  headline_sc: string | null;
  headline_en: string | null;
  subheadline_tc: string | null;
  subheadline_sc: string | null;
  subheadline_en: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  cta_label_tc: string | null;
  cta_label_sc: string | null;
  cta_label_en: string | null;
  badge_text_tc: string | null;
  badge_text_sc: string | null;
  badge_text_en: string | null;
  sponsor_name: string | null;
  is_paid: boolean | null;
};

type ArticleRow = {
  id: string;
  slug: string;
  article_type: PublicArticle["articleType"];
  title_tc: string | null;
  title_sc: string | null;
  title_en: string | null;
  excerpt_tc: string | null;
  excerpt_sc: string | null;
  excerpt_en: string | null;
  body_tc: string | null;
  body_sc: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  gallery_image_urls: unknown;
  source_url: string | null;
  sponsor_name: string | null;
  is_sponsored: boolean | null;
  featured: boolean | null;
  published_at: string | null;
};

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, 12);
}

function mapPromotion(
  row: PromotionRow,
  locale: AppLocale,
): PublicPromotionBanner {
  return {
    id: row.id,
    placement: row.placement,
    headline: localizedText(locale, {
      tc: row.headline_tc,
      sc: row.headline_sc,
      en: row.headline_en,
      fallback: "HK Family Fun",
    }),
    subheadline: localizedText(locale, {
      tc: row.subheadline_tc,
      sc: row.subheadline_sc,
      en: row.subheadline_en,
    }),
    imageUrl: String(row.image_url || "").trim(),
    mobileImageUrl: String(row.mobile_image_url || "").trim(),
    targetUrl: String(row.target_url || "").trim(),
    ctaLabel:
      localizedText(locale, {
        tc: row.cta_label_tc,
        sc: row.cta_label_sc,
        en: row.cta_label_en,
      }) || (locale === "en" ? "Learn more" : locale === "zh-Hans" ? "了解更多" : "了解更多"),
    badgeText: localizedText(locale, {
      tc: row.badge_text_tc,
      sc: row.badge_text_sc,
      en: row.badge_text_en,
    }),
    sponsorName: String(row.sponsor_name || "").trim(),
    isPaid: Boolean(row.is_paid),
  };
}

function mapArticle(row: ArticleRow, locale: AppLocale): PublicArticle {
  return {
    id: row.id,
    slug: row.slug,
    articleType: row.article_type,
    title: localizedText(locale, {
      tc: row.title_tc,
      sc: row.title_sc,
      en: row.title_en,
      fallback: locale === "en" ? "Untitled article" : "未命名文章",
    }),
    excerpt: localizedText(locale, {
      tc: row.excerpt_tc,
      sc: row.excerpt_sc,
      en: row.excerpt_en,
    }),
    body: localizedText(locale, {
      tc: row.body_tc,
      sc: row.body_sc,
      en: row.body_en,
    }),
    coverImageUrl: String(row.cover_image_url || "").trim(),
    galleryImageUrls: normalizeImages(row.gallery_image_urls),
    sourceUrl: String(row.source_url || "").trim(),
    sponsorName: String(row.sponsor_name || "").trim(),
    isSponsored: Boolean(row.is_sponsored),
    featured: Boolean(row.featured),
    publishedAt: row.published_at,
  };
}

export async function getActivePromotionBanners(
  placement: PromotionPlacement,
  locale: AppLocale,
  limit = 3,
): Promise<PublicPromotionBanner[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("promo_banners")
    .select(
      "id,placement,headline_tc,headline_sc,headline_en,subheadline_tc,subheadline_sc,subheadline_en,image_url,mobile_image_url,target_url,cta_label_tc,cta_label_sc,cta_label_en,badge_text_tc,badge_text_sc,badge_text_en,sponsor_name,is_paid",
    )
    .eq("placement", placement)
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
    .order("priority", { ascending: true })
    .limit(Math.max(limit * 4, 12));

  if (error) {
    if (!error.message.toLowerCase().includes("promo_banners")) {
      console.error("讀取 Promotion Banner 失敗：", error.message);
    }
    return [];
  }

  return ((data || []) as PromotionRow[])
    .filter((row) =>
      canShowPromotion({
        isPaid: row.is_paid,
        sponsorName: row.sponsor_name,
      }),
    )
    .slice(0, limit)
    .map((row) => mapPromotion(row, locale));
}

export async function getPublishedArticles(
  locale: AppLocale,
  limit = 24,
): Promise<PublicArticle[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_articles")
    .select(
      "id,slug,article_type,title_tc,title_sc,title_en,excerpt_tc,excerpt_sc,excerpt_en,body_tc,body_sc,body_en,cover_image_url,gallery_image_urls,source_url,sponsor_name,is_sponsored,featured,published_at",
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (!error.message.toLowerCase().includes("content_articles")) {
      console.error("讀取 News/Feature 失敗：", error.message);
    }
    return [];
  }

  return ((data || []) as ArticleRow[]).map((row) =>
    mapArticle(row, locale),
  );
}

export async function getPublishedArticleBySlug(
  slug: string,
  locale: AppLocale,
): Promise<PublicArticle | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_articles")
    .select(
      "id,slug,article_type,title_tc,title_sc,title_en,excerpt_tc,excerpt_sc,excerpt_en,body_tc,body_sc,body_en,cover_image_url,gallery_image_urls,source_url,sponsor_name,is_sponsored,featured,published_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return mapArticle(data as ArticleRow, locale);
}

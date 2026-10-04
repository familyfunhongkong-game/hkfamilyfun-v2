"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";

type Placement =
  | "home_top"
  | "home_middle"
  | "events_top"
  | "news_top"
  | "article_inline";

type Row = {
  id: string;
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

function text(locale: AppLocale, row: Row, prefix: "headline" | "subheadline" | "cta_label" | "badge_text") {
  return localizedText(locale, {
    tc: row[(prefix + "_tc") as keyof Row] as string | null,
    sc: row[(prefix + "_sc") as keyof Row] as string | null,
    en: row[(prefix + "_en") as keyof Row] as string | null,
  });
}

export default function ClientPromotionSlot({
  placement,
  locale,
  limit = 2,
}: {
  placement: Placement;
  locale: AppLocale;
  limit?: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabase) return;
      const result = await supabase
        .from("promo_banners")
        .select(
          "id,headline_tc,headline_sc,headline_en,subheadline_tc,subheadline_sc,subheadline_en,image_url,mobile_image_url,target_url,cta_label_tc,cta_label_sc,cta_label_en,badge_text_tc,badge_text_sc,badge_text_en,sponsor_name,is_paid",
        )
        .eq("placement", placement)
        .eq("status", "active")
        .order("priority", { ascending: true })
        .limit(limit);

      if (mounted && !result.error) setRows((result.data || []) as Row[]);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [placement, limit]);

  if (!rows.length) return null;

  return (
    <section
      className="mx-auto max-w-[1500px] px-4 py-5"
      aria-label="Promotions"
    >
      <div className="grid gap-4 lg:grid-cols-12">
        {rows.map((row, index) => {
          const headline =
            text(locale, row, "headline") ||
            (locale === "en" ? "HK Family Fun Promotion" : "HK Family Fun 推廣");
          const subheadline = text(locale, row, "subheadline");
          const cta =
            text(locale, row, "cta_label") ||
            (locale === "en" ? "Learn more" : "了解更多");
          const badge = text(locale, row, "badge_text");
          const image = row.image_url || row.mobile_image_url || "";
          const leadClass =
            index === 0 && rows.length > 1 ? "lg:col-span-8" : "lg:col-span-4";

          const card = (
            <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-sm">
              {image ? (
                <picture>
                  {row.mobile_image_url ? (
                    <source media="(max-width: 639px)" srcSet={row.mobile_image_url} />
                  ) : null}
                  <img
                    src={image}
                    alt={headline}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-56 w-full object-cover sm:h-64"
                  />
                </picture>
              ) : (
                <div className="h-56 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-400 sm:h-64" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {badge ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black backdrop-blur">
                      {badge}
                    </span>
                  ) : null}
                  {row.is_paid ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-700">
                      Sponsored
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-3 text-2xl font-black leading-tight">{headline}</h2>
                {subheadline ? (
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
                    {subheadline}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                    {cta}
                  </span>
                  {row.sponsor_name ? (
                    <span className="text-xs font-bold text-white/70">{row.sponsor_name}</span>
                  ) : null}
                </div>
              </div>
            </article>
          );

          return row.target_url ? (
            <Link
              key={row.id}
              href={row.target_url}
              target={row.target_url.startsWith("http") ? "_blank" : undefined}
              rel={row.target_url.startsWith("http") ? "noreferrer sponsored" : undefined}
              className={leadClass}
            >
              {card}
            </Link>
          ) : (
            <div key={row.id} className={leadClass}>
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}

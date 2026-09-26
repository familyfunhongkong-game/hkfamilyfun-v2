"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Placement = "home_top" | "home_mid" | "events_top" | "event_detail";

type PromoBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  placement: Placement;
  sort_order?: number | null;
};

export default function ActivePromoBanners({
  placement,
  fallback = false,
}: {
  placement: Placement;
  fallback?: boolean;
}) {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const client = supabase;
      if (!client) {
        setLoaded(true);
        return;
      }

      const { data } = await client
        .from("promo_banners")
        .select("id,title,subtitle,image_url,link_url,placement,sort_order")
        .eq("placement", placement)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .limit(3);

      if (!ignore) {
        setBanners((data || []) as PromoBanner[]);
        setLoaded(true);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [placement]);

  if (!loaded) {
    return <div className="h-24 animate-pulse rounded-[1.6rem] bg-slate-100" aria-hidden="true" />;
  }

  if (!banners.length) {
    if (!fallback) return null;

    return (
      <div className="rounded-[1.6rem] border border-dashed border-amber-300 bg-amber-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                Partner
              </span>
              <span className="text-xs font-black text-amber-800">合作推廣位置</span>
            </div>
            <p className="mt-2 text-lg font-black text-slate-950">
              親子品牌／活動主辦：想俾更多香港家長見到？
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Banner、精選活動及品牌合作內容會清楚標示，並需經 HK Family Fun 審批。
            </p>
          </div>
          <Link
            href="/merchant/register"
            className="shrink-0 rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-black text-white hover:bg-purple-700"
          >
            商戶合作 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {banners.map((banner) => {
        const body = (
          <div className="group relative min-h-[170px] overflow-hidden rounded-[1.6rem] bg-slate-950 shadow-sm ring-1 ring-black/5 sm:min-h-[210px]">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              onError={(imageEvent) => {
                imageEvent.currentTarget.src = "/familyfun-logo-original.png";
                imageEvent.currentTarget.style.objectFit = "contain";
                imageEvent.currentTarget.style.padding = "2rem";
                imageEvent.currentTarget.style.backgroundColor = "#ece1cf";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/5" />
            <div className="relative z-10 flex min-h-[170px] max-w-2xl flex-col justify-end p-5 text-white sm:min-h-[210px] sm:p-7">
              <span className="w-fit rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
                合作推廣
              </span>
              <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{banner.title}</h2>
              {banner.subtitle ? (
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/85">
                  {banner.subtitle}
                </p>
              ) : null}
            </div>
          </div>
        );

        return banner.link_url ? (
          <a key={banner.id} href={banner.link_url} target="_blank" rel="noreferrer sponsored" aria-label={banner.title}>
            {body}
          </a>
        ) : (
          <div key={banner.id}>{body}</div>
        );
      })}
    </div>
  );
}

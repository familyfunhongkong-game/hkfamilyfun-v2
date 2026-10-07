import Link from "next/link";
import type { PublicPromotionBanner } from "@/lib/content/public";

export default function PromotionSlot({
  banners,
}: {
  banners: PublicPromotionBanner[];
}) {
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8" aria-label="Promotions">
      <div className="grid gap-4 lg:grid-cols-12">
        {banners.map((banner, index) => {
          const isLead = index === 0;
          const image = banner.imageUrl || banner.mobileImageUrl;
          const isHouseBanner =
            banner.sponsorName === "HK Family Fun" &&
            banner.targetUrl === "/merchant-join";
          const columnClass =
            banners.length === 1
              ? "lg:col-span-12"
              : isLead
                ? "lg:col-span-8"
                : "lg:col-span-4";
          const body = (
            <article
              className={[
                "group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-sm",
              ].join(" ")}
            >
              {image ? (
                <picture>
                  {banner.mobileImageUrl ? (
                    <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />
                  ) : null}
                  <img
                    src={image}
                    alt={banner.headline}
                    loading={isLead ? "eager" : "lazy"}
                    decoding="async"
                    className={[
                      "h-48 w-full sm:h-60 lg:h-72",
                      isHouseBanner
                        ? "bg-gradient-to-br from-purple-100 via-white to-amber-100 object-contain p-8 sm:p-10"
                        : "object-cover",
                    ].join(" ")}
                  />
                </picture>
              ) : (
                <div className="h-64 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-400 sm:h-72" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {banner.badgeText ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black backdrop-blur">
                      {banner.badgeText}
                    </span>
                  ) : null}
                  {banner.isPaid ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-700">
                      Sponsored
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
                  {banner.headline}
                </h2>

                {banner.subheadline ? (
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
                    {banner.subheadline}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-black">
                  <span className="rounded-full bg-white px-4 py-2 text-slate-950">
                    {banner.ctaLabel}
                  </span>
                  {banner.sponsorName ? (
                    <span className="text-xs text-white/70">{banner.sponsorName}</span>
                  ) : null}
                </div>
              </div>
            </article>
          );

          return banner.targetUrl ? (
            <Link
              key={banner.id}
              href={banner.targetUrl}
              target={banner.targetUrl.startsWith("http") ? "_blank" : undefined}
              rel={banner.targetUrl.startsWith("http") ? "noreferrer sponsored" : undefined}
              className={columnClass}
            >
              {body}
            </Link>
          ) : (
            <div
              key={banner.id}
              className={isLead && banners.length > 1 ? "lg:col-span-8" : "lg:col-span-4"}
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

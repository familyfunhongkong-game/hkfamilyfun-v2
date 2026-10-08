import type { MetadataRoute } from "next";
import { getPublishedEvents } from "@/lib/supabase/events";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.hkfamilyfun.com";
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/events",
    "/today",
    "/calendar",
    "/events/map",
    "/tips",
    "/about",
    "/contact",
    "/merchant-join",
    "/merchant-pricing",
    "/privacy",
    "/terms",
    "/disclaimer",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency:
      path === "/events" || path === "/today" || path === "/calendar"
        ? "daily"
        : "weekly",
    priority: path === "" ? 1 : path.startsWith("/events") ? 0.9 : 0.7,
  }));

  const events = await getPublishedEvents();
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => {
    const lastModifiedSource = event.updatedAt || event.publishedAt;
    const parsedLastModified = lastModifiedSource
      ? new Date(lastModifiedSource)
      : null;

    return {
      url: `${baseUrl}/events/${event.id}`,
      ...(parsedLastModified && !Number.isNaN(parsedLastModified.getTime())
        ? { lastModified: parsedLastModified }
        : {}),
      changeFrequency: "daily",
      priority: 0.8,
    };
  });

  return [...staticRoutes, ...eventRoutes];
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/merchant/dashboard",
          "/merchant/events/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.hkfamilyfun.com/sitemap.xml",
    host: "https://www.hkfamilyfun.com",
  };
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.MAINTENANCE_MODE === "true") {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      host: "https://www.hkfamilyfun.com",
    };
  }

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

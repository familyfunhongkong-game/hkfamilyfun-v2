import { NextRequest, NextResponse } from "next/server";

const INTERNAL_PREFIXES = ["/admin", "/merchant", "/api"];
const PUBLIC_ASSET_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
// Legal and account data deletion instructions must remain publicly accessible
// to visitors and OAuth provider reviewers even while the main site is offline.
const PUBLIC_LEGAL_PATHS = new Set([
  "/privacy",
  "/terms",
  "/data-deletion",
  "/merchant-terms",
  "/disclaimer",
]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPrivatePortal =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/merchant" ||
    pathname.startsWith("/merchant/");

  const withPrivatePortalHeaders = (response: NextResponse) => {
    if (isPrivatePortal) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  };

  if (process.env.MAINTENANCE_MODE !== "true") {
    return withPrivatePortalHeaders(NextResponse.next());
  }

  const host = request.headers.get("host")?.toLowerCase() || "";
  const isLiveHost =
    host === "hkfamilyfun.com" || host === "www.hkfamilyfun.com";

  if (!isLiveHost) {
    return withPrivatePortalHeaders(NextResponse.next());
  }

  if (
    pathname === "/maintenance" ||
    PUBLIC_LEGAL_PATHS.has(pathname.endsWith("/") ? pathname.slice(0, -1) : pathname) ||
    INTERNAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")) ||
    PUBLIC_ASSET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
  ) {
    return withPrivatePortalHeaders(NextResponse.next());
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";
  return withPrivatePortalHeaders(NextResponse.rewrite(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

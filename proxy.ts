import { NextRequest, NextResponse } from "next/server";

const INTERNAL_PREFIXES = ["/admin", "/merchant", "/api"];
const PUBLIC_ASSET_PREFIXES = ["/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  const host = request.headers.get("host")?.toLowerCase() || "";
  const isLiveHost =
    host === "hkfamilyfun.com" || host === "www.hkfamilyfun.com";

  if (!isLiveHost) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/maintenance" ||
    INTERNAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")) ||
    PUBLIC_ASSET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

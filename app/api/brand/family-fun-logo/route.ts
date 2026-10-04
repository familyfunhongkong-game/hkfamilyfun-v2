import { LOGO_PART_1 } from "@/lib/brand/family-fun-logo-part-1";
import { LOGO_PART_2 } from "@/lib/brand/family-fun-logo-part-2";
import { LOGO_PART_3 } from "@/lib/brand/family-fun-logo-part-3";
import { LOGO_PART_4 } from "@/lib/brand/family-fun-logo-part-4";

export const runtime = "nodejs";
export const dynamic = "force-static";

const PNG = Buffer.from(
  LOGO_PART_1 + LOGO_PART_2 + LOGO_PART_3 + LOGO_PART_4,
  "base64",
);

export async function GET() {
  return new Response(PNG, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(PNG.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

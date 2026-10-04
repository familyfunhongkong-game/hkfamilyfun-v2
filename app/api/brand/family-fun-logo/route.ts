import crypto from "node:crypto";
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

const EXPECTED_BYTES = 20047;
const EXPECTED_SHA256 = "bf9f56f08f6a2cf522db388037e83c2d3363ebc5858400378efd6ead4ade9fa5";

function assertOriginalLogo() {
  const hash = crypto.createHash("sha256").update(PNG).digest("hex");
  if (PNG.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
    throw new Error("Family Fun logo asset integrity check failed");
  }
}

export async function GET() {
  assertOriginalLogo();
  return new Response(PNG, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(PNG.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: "\"bf9f56f08f6a2cf522db388037e83c2d3363ebc5858400378efd6ead4ade9fa5\"",
    },
  });
}

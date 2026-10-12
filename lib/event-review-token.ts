import crypto from "node:crypto";

function reviewSecret() {
  return String(
    process.env.APPROVAL_ACTION_SECRET ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "",
  ).trim();
}

export function verifyEventReviewToken(
  eventId: string,
  expiresAt: string | number,
  signature: string,
) {
  const secret = reviewSecret();
  const expires = Number(expiresAt);
  if (!secret || !eventId || !signature || !Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(eventId) + "." + String(expires))
    .digest("hex");

  const supplied = String(signature).trim().toLowerCase();
  if (expected.length !== supplied.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(supplied, "utf8"),
  );
}

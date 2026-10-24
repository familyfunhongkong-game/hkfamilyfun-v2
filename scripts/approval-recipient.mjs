// Pure recipient selection for sensitive one-click approval emails.
// A known bounced operational inbox must not be trusted as delivered.
// The fallback is derived exclusively from current active Super Admin records.
const KNOWN_BOUNCING_INBOX = "info@hkfamilyfun.com";

function validEmail(value) {
  return typeof value === "string"
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    && value.length <= 254;
}

export async function resolveApprovalRecipient(configured, loadActiveSuperAdmins) {
  const requested = String(configured || "").trim();
  if (requested && requested.toLowerCase() !== KNOWN_BOUNCING_INBOX) {
    if (!validEmail(requested)) throw new Error("Configured Admin approval recipient is invalid");
    return requested;
  }
  if (typeof loadActiveSuperAdmins !== "function") {
    throw new Error("Active Super Admin lookup is required for notification fallback");
  }
  const records = await loadActiveSuperAdmins();
  if (!Array.isArray(records)) throw new Error("Super Admin email lookup failed");
  const verified = [...new Set(records.map(x => String(x || "").trim().toLowerCase()).filter(validEmail))]
    .filter(email => email !== KNOWN_BOUNCING_INBOX);
  if (verified.length !== 1) {
    throw new Error("Exactly one active Super Admin recipient is required; notification was not sent");
  }
  return verified[0];
}

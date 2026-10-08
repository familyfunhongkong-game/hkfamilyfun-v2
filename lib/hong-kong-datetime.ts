const HONG_KONG_UTC_OFFSET = "+08:00";

export function isoToHongKongDatetimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hongKongClock = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return hongKongClock.toISOString().slice(0, 16);
}

export function hongKongDatetimeLocalToIso(value?: string | null) {
  if (!value) return null;

  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}${HONG_KONG_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatHongKongDateTime(
  value?: string | null,
  fallback = "—",
) {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

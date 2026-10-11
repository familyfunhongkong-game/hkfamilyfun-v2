function validDateText(value: unknown) {
  const text = String(value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isExplicitlyExpiredEvent(
  endDate: unknown,
  today = hongKongToday(),
) {
  const end = validDateText(endDate);
  const current = validDateText(today);
  return Boolean(end && current && end < current);
}

export function isCurrentOrOpenEndedEvent(
  endDate: unknown,
  today = hongKongToday(),
) {
  return !isExplicitlyExpiredEvent(endDate, today);
}

export function isOpenEndedPastStart(
  startDate: unknown,
  endDate: unknown,
  today = hongKongToday(),
) {
  const start = validDateText(startDate);
  const end = validDateText(endDate);
  const current = validDateText(today);

  return Boolean(!end && start && current && start < current);
}

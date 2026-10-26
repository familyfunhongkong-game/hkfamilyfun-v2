// Date-only extraction from Chinese event descriptions.
// Never let malformed dates become a published schedule.
/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {string}
 */
export function validEventDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger) ||
      year < 2000 || year > 2100 || month < 1 || month > 12 ||
      day < 1 || day > 31) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const chineseRangePattern = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(?:至|到|－|–|-|~)\s*(?:(\d{4})年)?\s*(\d{1,2})月\s*(\d{1,2})日/;

/** @param {string} text */
export function hasChineseEventDateRange(text) {
  return chineseRangePattern.test(String(text || ""));
}

/** @param {string} text */
export function extractChineseEventDateRange(text) {
  const found = String(text || "").match(chineseRangePattern);
  if (!found) return null;
  const year = Number(found[1]);
  const startMonth = Number(found[2]);
  const endMonth = Number(found[5]);
  const explicitYear = found[4] ? Number(found[4]) : null;
  const endYear = explicitYear ?? (endMonth < startMonth ? year + 1 : year);
  const start_date = validEventDate(year, startMonth, Number(found[3]));
  const end_date = validEventDate(endYear, endMonth, Number(found[6]));
  if (!start_date || !end_date || start_date > end_date) return null;
  return { start_date, end_date };
}

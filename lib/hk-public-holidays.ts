export type PublicHoliday = {
  date: string;
  nameTc: string;
  nameSc: string;
  nameEn: string;
};

const HOLIDAYS_2026: PublicHoliday[] = [
  { date: "2026-01-01", nameTc: "元旦", nameSc: "元旦", nameEn: "New Year's Day" },
  { date: "2026-02-17", nameTc: "農曆年初一", nameSc: "农历年初一", nameEn: "Lunar New Year's Day" },
  { date: "2026-02-18", nameTc: "農曆年初二", nameSc: "农历年初二", nameEn: "Second day of Lunar New Year" },
  { date: "2026-02-19", nameTc: "農曆年初三", nameSc: "农历年初三", nameEn: "Third day of Lunar New Year" },
  { date: "2026-04-03", nameTc: "耶穌受難節", nameSc: "耶稣受难节", nameEn: "Good Friday" },
  { date: "2026-04-04", nameTc: "耶穌受難節翌日", nameSc: "耶稣受难节翌日", nameEn: "Day following Good Friday" },
  { date: "2026-04-06", nameTc: "清明節翌日", nameSc: "清明节翌日", nameEn: "Day following Ching Ming Festival" },
  { date: "2026-04-07", nameTc: "復活節星期一翌日", nameSc: "复活节星期一翌日", nameEn: "Day following Easter Monday" },
  { date: "2026-05-01", nameTc: "勞動節", nameSc: "劳动节", nameEn: "Labour Day" },
  { date: "2026-05-25", nameTc: "佛誕翌日", nameSc: "佛诞翌日", nameEn: "Day following the Birthday of the Buddha" },
  { date: "2026-06-19", nameTc: "端午節", nameSc: "端午节", nameEn: "Tuen Ng Festival" },
  { date: "2026-07-01", nameTc: "香港特別行政區成立紀念日", nameSc: "香港特别行政区成立纪念日", nameEn: "HKSAR Establishment Day" },
  { date: "2026-09-26", nameTc: "中秋節翌日", nameSc: "中秋节翌日", nameEn: "Day following the Chinese Mid-Autumn Festival" },
  { date: "2026-10-01", nameTc: "國慶日", nameSc: "国庆日", nameEn: "National Day" },
  { date: "2026-10-19", nameTc: "重陽節翌日", nameSc: "重阳节翌日", nameEn: "Day following Chung Yeung Festival" },
  { date: "2026-12-25", nameTc: "聖誕節", nameSc: "圣诞节", nameEn: "Christmas Day" },
  { date: "2026-12-26", nameTc: "聖誕節後第一個周日", nameSc: "圣诞节后第一个周日", nameEn: "First weekday after Christmas Day" },
];

const HOLIDAYS_2027: PublicHoliday[] = [
  { date: "2027-01-01", nameTc: "元旦", nameSc: "元旦", nameEn: "New Year's Day" },
  { date: "2027-02-06", nameTc: "農曆年初一", nameSc: "农历年初一", nameEn: "Lunar New Year's Day" },
  { date: "2027-02-08", nameTc: "農曆年初三", nameSc: "农历年初三", nameEn: "Third day of Lunar New Year" },
  { date: "2027-02-09", nameTc: "農曆年初四", nameSc: "农历年初四", nameEn: "Fourth day of Lunar New Year" },
  { date: "2027-03-26", nameTc: "耶穌受難節", nameSc: "耶稣受难节", nameEn: "Good Friday" },
  { date: "2027-03-27", nameTc: "耶穌受難節翌日", nameSc: "耶稣受难节翌日", nameEn: "Day following Good Friday" },
  { date: "2027-03-29", nameTc: "復活節星期一", nameSc: "复活节星期一", nameEn: "Easter Monday" },
  { date: "2027-04-05", nameTc: "清明節", nameSc: "清明节", nameEn: "Ching Ming Festival" },
  { date: "2027-05-01", nameTc: "勞動節", nameSc: "劳动节", nameEn: "Labour Day" },
  { date: "2027-05-13", nameTc: "佛誕", nameSc: "佛诞", nameEn: "Birthday of the Buddha" },
  { date: "2027-06-09", nameTc: "端午節", nameSc: "端午节", nameEn: "Tuen Ng Festival" },
  { date: "2027-07-01", nameTc: "香港特別行政區成立紀念日", nameSc: "香港特别行政区成立纪念日", nameEn: "HKSAR Establishment Day" },
  { date: "2027-09-16", nameTc: "中秋節翌日", nameSc: "中秋节翌日", nameEn: "Day following the Chinese Mid-Autumn Festival" },
  { date: "2027-10-01", nameTc: "國慶日", nameSc: "国庆日", nameEn: "National Day" },
  { date: "2027-10-08", nameTc: "重陽節", nameSc: "重阳节", nameEn: "Chung Yeung Festival" },
  { date: "2027-12-25", nameTc: "聖誕節", nameSc: "圣诞节", nameEn: "Christmas Day" },
  { date: "2027-12-27", nameTc: "聖誕節後第一個周日", nameSc: "圣诞节后第一个周日", nameEn: "First weekday after Christmas Day" },
];

const HOLIDAYS = new Map(
  [...HOLIDAYS_2026, ...HOLIDAYS_2027].map((holiday) => [holiday.date, holiday]),
);

export function getHongKongPublicHoliday(date: string) {
  return HOLIDAYS.get(date) || null;
}

export function getHongKongPublicHolidayName(
  holiday: PublicHoliday,
  locale: string,
) {
  if (locale === "en") return holiday.nameEn;
  if (locale === "zh-Hans") return holiday.nameSc;
  return holiday.nameTc;
}

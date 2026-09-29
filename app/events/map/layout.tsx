import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "附近親子活動地圖｜香港地點探索",
  description:
    "用互動地圖搜尋香港附近親子活動，按今日、明日、週末、地區、港鐵、免費、SEN友善及距離篩選，並可直接開啟Google Maps路線。",
  alternates: {
    canonical: "/events/map",
  },
  openGraph: {
    title: "附近親子活動地圖｜HK Family Fun",
    description:
      "地圖搜尋香港附近親子活動，支援日期、地區、港鐵、免費、SEN友善及附近距離。",
    url: "/events/map",
    type: "website",
  },
};

export default function EventsMapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

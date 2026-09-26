import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "香港親子活動地點探索",
  description: "按地區、港鐵站及地址探索香港親子活動，並使用活動提供的地點連接 Google Maps。",
  alternates: {
    canonical: "/events/map",
  },
  openGraph: {
    url: "/events/map",
  },
};

export default function EventMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

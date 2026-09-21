import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "香港親子活動搜尋",
  description:
    "搜尋香港今日、明日、週末、免費、室內、戶外及不同地區的親子活動。",
  alternates: {
    canonical: "/events",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

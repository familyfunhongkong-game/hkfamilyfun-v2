import type { Metadata } from "next";
import "./globals.css";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const metadata: Metadata = {
  title: {
    default: "HK Family Fun | 香港親子活動搜尋平台",
    template: "%s | HK Family Fun",
  },
  description: "一站式搜尋香港親子活動，包括免費活動、SEN 友善活動及週末好去處。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      <body className="min-h-screen font-sans">
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}

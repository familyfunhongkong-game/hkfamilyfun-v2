import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商戶加入",
  description: "商戶免費登記上架親子活動，WhatsApp 協助上架，聯絡 5701 8297。",
};

export default function MerchantJoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

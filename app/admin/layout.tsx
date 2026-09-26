import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminAccessGate from "./AdminAccessGate";

export const metadata: Metadata = {
  title: "HK Family Fun Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}

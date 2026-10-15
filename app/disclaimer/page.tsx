import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { disclaimerLegal } from "@/lib/legal/disclaimer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const data = disclaimerLegal[locale];
  return {
    title: data.title,
    description: data.lead,
    alternates: { canonical: "/disclaimer" },
  };
}

export default function Page() {
  return <LegalPolicyPage translations={disclaimerLegal} />;
}

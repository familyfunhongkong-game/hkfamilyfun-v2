import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { disclaimerLegal } from "@/lib/legal/disclaimer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = disclaimerLegal[locale];
  return {
    title: copy.title,
    description: copy.lead,
    alternates: { canonical: "/disclaimer" },
  };
}

export default function DisclaimerLegalPage() {
  return <LegalPolicyPage translations={disclaimerLegal} />;
}

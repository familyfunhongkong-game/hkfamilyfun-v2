import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { termsLegal } from "@/lib/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = termsLegal[locale];
  return {
    title: copy.title,
    description: copy.lead,
    alternates: { canonical: "/terms" },
  };
}

export default function TermsLegalPage() {
  return <LegalPolicyPage translations={termsLegal} />;
}

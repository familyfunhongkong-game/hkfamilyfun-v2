import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { privacyLegal } from "@/lib/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = privacyLegal[locale];
  return {
    title: copy.title,
    description: copy.lead,
    alternates: { canonical: "/privacy" },
  };
}

export default function PrivacyLegalPage() {
  return <LegalPolicyPage translations={privacyLegal} />;
}

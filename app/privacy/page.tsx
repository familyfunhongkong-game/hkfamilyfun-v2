import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { privacyLegal } from "@/lib/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const data = privacyLegal[locale];
  return {
    title: data.title,
    description: data.lead,
    alternates: { canonical: "/privacy" },
  };
}

export default function Page() {
  return <LegalPolicyPage translations={privacyLegal} />;
}

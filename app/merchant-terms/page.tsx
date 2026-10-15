import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { merchantTermsLegal } from "@/lib/legal/merchant-terms";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const data = merchantTermsLegal[locale];
  return {
    title: data.title,
    description: data.lead,
    alternates: { canonical: "/merchant-terms" },
  };
}

export default function Page() {
  return <LegalPolicyPage translations={merchantTermsLegal} />;
}

import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { merchantLegal } from "@/lib/legal/merchant";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = merchantLegal[locale];
  return {
    title: copy.title,
    description: copy.lead,
    alternates: { canonical: "/merchant-terms" },
  };
}

export default function MerchantLegalPage() {
  return <LegalPolicyPage translations={merchantLegal} />;
}

import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { termsLegal } from "@/lib/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const data = termsLegal[locale];
  return {
    title: data.title,
    description: data.lead,
    alternates: { canonical: "/terms" },
  };
}

export default function Page() {
  return <LegalPolicyPage translations={termsLegal} />;
}

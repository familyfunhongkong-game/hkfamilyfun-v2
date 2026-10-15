import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { deletionLegal } from "@/lib/legal/deletion";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const data = deletionLegal[locale];
  return {
    title: data.title,
    description: data.lead,
    alternates: { canonical: "/data-deletion" },
  };
}

export default function Page() {
  return <LegalPolicyPage translations={deletionLegal} />;
}

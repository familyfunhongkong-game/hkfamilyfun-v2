import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { getServerLocale } from "@/lib/i18n/server";
import { deletionLegal } from "@/lib/legal/deletion";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = deletionLegal[locale];
  return {
    title: copy.title,
    description: copy.lead,
    alternates: { canonical: "/data-deletion" },
  };
}

export default function DeletionLegalPage() {
  return <LegalPolicyPage translations={deletionLegal} />;
}

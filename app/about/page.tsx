import { SimpleInfoPage } from "@/components/SimpleInfoPage";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function AboutPage() {
  const locale = await getServerLocale();
  const m = getExtraPublicMessages(locale).about;

  return (
    <SimpleInfoPage
      eyebrow="About HK Family Fun"
      title={m.title}
      subtitle={m.subtitle}
    >
      {m.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </SimpleInfoPage>
  );
}

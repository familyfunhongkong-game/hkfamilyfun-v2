import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ContactPage() {
  const locale = await getServerLocale();
  const m = getExtraPublicMessages(locale).contact;

  return (
    <SimpleInfoPage
      eyebrow="Contact"
      title={m.title}
      subtitle={m.subtitle}
    >
      <InfoSection title="Email">
        <p>
          <a
            href="mailto:info@hkfamilyfun.com"
            className="font-black text-purple-700 hover:text-purple-900"
          >
            info@hkfamilyfun.com
          </a>
        </p>
      </InfoSection>

      <InfoSection title="WhatsApp">
        <p>
          <a
            href="https://wa.me/85257018297"
            target="_blank"
            rel="noreferrer"
            className="font-black text-purple-700 hover:text-purple-900"
          >
            +852 5701 8297
          </a>
        </p>
        <p className="text-slate-500">{m.contactNote}</p>
      </InfoSection>

      <InfoSection title={m.social}>
        <div className="flex flex-wrap gap-3">
          <a className="font-black text-purple-700" href="https://www.instagram.com/hk.familyfun" target="_blank" rel="noreferrer">Instagram</a>
          <a className="font-black text-purple-700" href="https://www.facebook.com/hk.familyfun1112" target="_blank" rel="noreferrer">Facebook</a>
          <a className="font-black text-purple-700" href="https://www.threads.com/@hk.familyfun" target="_blank" rel="noreferrer">Threads</a>
        </div>
      </InfoSection>
    </SimpleInfoPage>
  );
}

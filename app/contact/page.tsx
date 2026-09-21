import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function ContactPage() {
  return (
    <SimpleInfoPage
      eyebrow="Contact"
      title="聯絡我們"
      subtitle="活動資料更正、商戶合作、平台問題或其他查詢，歡迎聯絡 HK Family Fun。"
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
        <p className="text-slate-500">
          建議使用 WhatsApp 留言或 Email 聯絡，方便我們保留資料並跟進。
        </p>
      </InfoSection>

      <InfoSection title="社交平台">
        <div className="flex flex-wrap gap-3">
          <a className="font-black text-purple-700" href="https://www.instagram.com/hk.familyfun" target="_blank" rel="noreferrer">Instagram</a>
          <a className="font-black text-purple-700" href="https://www.facebook.com/hk.familyfun1112" target="_blank" rel="noreferrer">Facebook</a>
          <a className="font-black text-purple-700" href="https://www.threads.com/@hk.familyfun" target="_blank" rel="noreferrer">Threads</a>
        </div>
      </InfoSection>
    </SimpleInfoPage>
  );
}

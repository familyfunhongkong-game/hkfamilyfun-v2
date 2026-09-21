import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function IpComplaintPage() {
  return (
    <SimpleInfoPage
      eyebrow="IP Complaint"
      title="知識產權／侵權投訴"
      subtitle="如你認為 HK Family Fun 上的內容侵犯你的權利，請提供足夠資料讓我們核實及跟進。"
    >
      <InfoSection title="請提供">
        <ul className="list-disc space-y-2 pl-5">
          <li>投訴人姓名／機構名稱及聯絡方式</li>
          <li>被投訴活動或頁面 URL</li>
          <li>涉及的圖片、文字、商標或其他內容</li>
          <li>你擁有相關權利或獲授權代表權利人的說明</li>
          <li>可協助核實的原始來源或證明</li>
        </ul>
      </InfoSection>

      <InfoSection title="提交方式">
        <p>
          請電郵
          {" "}
          <a
            href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20IP%20Complaint"
            className="font-black text-purple-700"
          >
            info@hkfamilyfun.com
          </a>
          ，標題註明「IP Complaint」。
        </p>
      </InfoSection>
    </SimpleInfoPage>
  );
}

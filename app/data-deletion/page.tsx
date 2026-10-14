import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export const metadata = {
  title: "帳戶及個人資料刪除申請 | HK Family Fun",
  description: "如何要求 HK Family Fun 刪除帳戶及透過 Google 或 Facebook 登入而收集的個人資料。",
};

export default function DataDeletionPage() {
  return (
    <SimpleInfoPage
      eyebrow="Account & User Data Deletion"
      title="帳戶及個人資料刪除申請"
      subtitle="你可以要求 HK Family Fun 刪除帳戶及相關個人資料，包括使用 Google 或 Facebook 登入時與我們分享的帳戶資料。"
    >
      <InfoSection title="如何提交刪除申請">
        <p>請使用你在 HK Family Fun 登記的電郵地址發送申請至以下地址：</p>
        <p>
          <a
            href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20Account%20and%20Data%20Deletion%20Request"
            className="font-black text-purple-700 underline"
          >
            info@hkfamilyfun.com
          </a>
        </p>
        <p>電郵主旨請寫「HK Family Fun 帳戶及個人資料刪除申請」（Account and Data Deletion Request）。請提供帳戶使用的電郵地址，以及你希望刪除整個帳戶還是指定資料。毋須提供密碼、驗證碼或身份證副本。</p>
      </InfoSection>
      <InfoSection title="我們如何處理">
        <p>為保障帳戶安全，我們可能會要求你透過已登記的電郵地址確認申請，或以其他合理方法驗證帳戶擁有權。</p>
        <p>確認身份及申請範圍後，我們會處理可刪除的帳戶、登入相關個人資料及相關記錄，並在完成後回覆你。某些交易、審計、安全或法律合規記錄可能需要依法繼續保留，屆時會說明原因。</p>
        <p>刪除帳戶可能使你無法再登入、管理商戶資料或存取先前儲存的內容。涉及商戶已公開活動的下架或內容處理，請在申請中註明。</p>
      </InfoSection>
      <InfoSection title="Facebook／Google 登入">
        <p>如果你使用 Facebook 或 Google 登入 HK Family Fun，亦可按以上步驟要求刪除平台保存的登入及帳戶資料。你可以在 Facebook 或 Google 帳戶設定中撤銷 HK Family Fun 的連接權限；但撤銷授權不一定會自動刪除我們系統內原有的資料，因此如需刪除請同時聯絡我們。</p>
      </InfoSection>
      <InfoSection title="其他私隱查詢">
        <p>如需查閱、更正或查詢個人資料的處理方式，請參閱 <a href="/privacy" className="font-black text-purple-700 underline">HK Family Fun 私隱政策</a>，或電郵 info@hkfamilyfun.com。</p>
      </InfoSection>
    </SimpleInfoPage>
  );
}

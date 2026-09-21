import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function PrivacyPage() {
  return (
    <SimpleInfoPage
      eyebrow="Privacy Policy"
      title="私隱政策"
      subtitle="HK Family Fun 會按香港適用私隱要求處理平台上的個人資料。"
    >
      <InfoSection title="1. 我們收集哪些資料">
        <p>我們可能收集姓名、電郵地址、電話號碼、帳戶資料、收藏／報告／查詢記錄、商戶提交資料，以及裝置、瀏覽器、IP、Cookies 和分析資料。</p>
        <p>如日後提供付款功能，相關付款資料通常會由第三方支付服務商處理。</p>
      </InfoSection>

      <InfoSection title="2. 我們為何收集">
        <p>用途包括提供及維持網站服務、建立及管理帳戶、處理查詢及通知、審核商戶與活動提交、改善網站體驗及流量分析，以及防止欺詐、濫用和保安風險。</p>
      </InfoSection>

      <InfoSection title="3. 是否必須提供">
        <p>某些資料為提供特定服務所必需；如你不提供，相關功能可能無法使用。</p>
      </InfoSection>

      <InfoSection title="4. 我們與誰共享資料">
        <p>我們可能按需要與雲端服務、分析工具、郵件服務、支付服務、授權資料處理者，以及在法律要求下與監管或執法機構共享必要資料。</p>
      </InfoSection>

      <InfoSection title="5. Cookies 及分析工具">
        <p>網站可使用 Cookies、Analytics 及類似技術，以記錄偏好設定、量度流量、改善內容及提升使用體驗。</p>
      </InfoSection>

      <InfoSection title="6. 直接促銷">
        <p>如你同意接收推廣資訊，我們可向你發送活動推介、商戶優惠或平台消息。你可隨時取消訂閱。使用個人資料作直接促銷前會按適用要求取得同意或不反對表示；沉默不構成同意。</p>
      </InfoSection>

      <InfoSection title="7. 保留期限">
        <p>我們只會在為達成收集目的所需期間內保留個人資料，其後會刪除、匿名化或按法律要求保留。</p>
      </InfoSection>

      <InfoSection title="8. 資料安全">
        <p>我們會採取合理可行的技術及管理措施，防止未經授權存取、處理、遺失或披露個人資料。</p>
      </InfoSection>

      <InfoSection title="9. 查閱及更正">
        <p>你可要求查閱及更正我們持有的個人資料。</p>
      </InfoSection>

      <InfoSection title="10. 聯絡方式">
        <p>
          如你希望查閱、更正或查詢個人資料處理方式，請電郵
          {" "}
          <a className="font-black text-purple-700" href="mailto:info@hkfamilyfun.com">
            info@hkfamilyfun.com
          </a>
          。
        </p>
      </InfoSection>

      <InfoSection title="11. 政策更新">
        <p>本私隱政策可不時更新，更新版本於網站公布後生效。</p>
      </InfoSection>
    </SimpleInfoPage>
  );
}

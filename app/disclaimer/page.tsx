import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function DisclaimerPage() {
  return (
    <SimpleInfoPage eyebrow="Disclaimer" title="免責聲明">
      <InfoSection title="1. 平台角色">
        <p>HK Family Fun 為資訊整理及活動發現平台。除另有明確說明外，本平台並非活動之主辦、協辦、代理、承辦、保險、交通、場地、醫療或安全服務提供者。</p>
      </InfoSection>

      <InfoSection title="2. 資料來源">
        <p>網站所載活動資料可能來自主辦方、商戶、合作機構、非牟利機構、公開網站或平台整理。即使平台已作基本審核或編輯，仍可能出現延誤、變更、遺漏或錯誤。</p>
      </InfoSection>

      <InfoSection title="3. 不構成建議">
        <p>網站內容不構成專業、法律、醫療、教育或安全建議。對於兒童、SEN 兒童、孕婦、長者或有特殊健康情況人士，參與活動前應自行判斷並向主辦方或合適專業人士查詢。</p>
      </InfoSection>

      <InfoSection title="4. 活動風險">
        <p>活動之安全、場地狀況、人流控制、天氣安排、導師資格、保險、票務、取消、退款及現場執行，由相關主辦方或服務提供者負責。</p>
      </InfoSection>

      <InfoSection title="5. 第三方網站及交易">
        <p>網站可能導向第三方報名、購票、聯絡或支付頁面。HK Family Fun 不保證第三方服務之表現、可用性、私隱處理或交易結果。</p>
      </InfoSection>

      <InfoSection title="6. 平台不保證">
        <p>平台不保證每項活動均適合任何兒童或家庭、每項活動資訊均即時更新、每項商戶持續符合某一標準，或平台服務永不中斷及無技術故障。</p>
      </InfoSection>

      <InfoSection title="7. 法律保留">
        <p>本免責聲明不排除任何依法不能排除的責任。</p>
      </InfoSection>
    </SimpleInfoPage>
  );
}

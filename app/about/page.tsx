import { SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function AboutPage() {
  return (
    <SimpleInfoPage
      eyebrow="About HK Family Fun"
      title="關於我們"
      subtitle="讓香港家庭更容易找到合適、清楚、仍然有效的親子活動。"
    >
      <p>
        HK Family Fun 是香港親子活動資訊平台，整理不同地區、日期、價錢及類型的家庭活動，
        讓家長毋須在多個網站及社交平台逐一搜尋。
      </p>
      <p>
        我們亦為活動主辦方及商戶提供活動提交、草稿管理、圖片上載、預覽、審批及發布工具，
        讓活動資料可以更有效率地更新。
      </p>
      <p>
        平台重視資料時效、來源及清晰度。活動最終日期、名額、收費、場地及報名安排，
        仍以主辦單位最新公布為準。
      </p>
    </SimpleInfoPage>
  );
}

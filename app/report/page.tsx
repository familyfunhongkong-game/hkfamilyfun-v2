import Link from "next/link";
import { InfoSection, SimpleInfoPage } from "@/components/SimpleInfoPage";

export default function ReportPage() {
  return (
    <SimpleInfoPage
      eyebrow="Report Content"
      title="報錯／舉報內容"
      subtitle="如你發現活動資料有錯誤、失實、已取消、連結失效、重複、誤導或不適合家庭內容，請通知我們。"
    >
      <InfoSection title="一般活動資料回報">
        <p>請在訊息中提供活動名稱、相關頁面連結、需要更正的內容，以及可供核實的官方來源（如有）。</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:info@hkfamilyfun.com?subject=HK%20Family%20Fun%20活動資料回報"
            className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
          >
            Email 回報
          </a>
          <a
            href="https://wa.me/85257018297?text=你好，我想回報 HK Family Fun 活動資料："
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            WhatsApp 回報
          </a>
        </div>
      </InfoSection>

      <InfoSection title="知識產權／侵權問題">
        <p>如涉及未獲授權使用圖片、文字、商標或其他知識產權，請使用侵權投訴頁面提供完整資料。</p>
        <Link href="/report/ip-complaint" className="font-black text-purple-700">
          前往侵權投訴 →
        </Link>
      </InfoSection>
    </SimpleInfoPage>
  );
}

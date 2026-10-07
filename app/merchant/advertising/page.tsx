import Link from "next/link";
import { HK_FAMILY_FUN_BUSINESS_MODEL } from "@/lib/business-model";
import MerchantAdvertisingEnquiryForm from "@/components/merchant-advertising-enquiry-form";

const packages = [
  {
    title: "首頁 Banner / Hero",
    description:
      "適合大型親子活動、品牌合作及重點 campaign。屬付費 Sponsored 廣告，需由 HK Family Fun 確認付款後才會排期上架。",
    placement: "Homepage",
  },
  {
    title: "活動搜尋頁 Featured",
    description:
      "在家長搜尋活動時增加曝光。一般活動 listing 仍然免費；只有額外 Featured / Sponsored 曝光才收費。",
    placement: "Events",
  },
  {
    title: "News / Feature Sponsor",
    description:
      "適合品牌故事、活動重點或合作內容。所有付費內容會清楚標示 Sponsored。",
    placement: "Content",
  },
];

export default function MerchantAdvertisingPage() {
  const sellEnabled = HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunEnabled;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Link href="/merchant/dashboard" className="text-sm font-black text-purple-700">
            ← 返回 Merchant Dashboard
          </Link>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-purple-700">
            Merchant Growth
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            免費刊登活動 · 付費增加曝光
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            HK Family Fun 的一般活動資料上載、提交審批及公開 listing 不收費。
            商戶只有在選擇 Banner、Featured 或 Sponsored 曝光服務時才需要付費。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              Free
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">一般活動刊登</h2>
            <ul className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-700">
              <li>✓ 建立及修改活動資料</li>
              <li>✓ 上載活動圖片及官方連結</li>
              <li>✓ 提交 HK Family Fun 審批</li>
              <li>✓ 批准後在平台正常活動列表公開</li>
            </ul>
            <Link
              href="/merchant/dashboard"
              className="mt-6 inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white"
            >
              免費管理活動
            </Link>
          </article>

          <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">
              Paid
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">廣告 / Featured Promotion</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
              廣告位與一般活動 listing 完全分開。商戶廣告必須先完成付款確認，
              才會由 Admin 安排上架時間及 Sponsored 標示。
            </p>
            <a
              href="#advertising-enquiry"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              直接提交廣告查詢
            </a>
          </article>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {packages.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700">
                {item.placement}
              </span>
              <h2 className="mt-4 text-xl font-black text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>

        <div id="advertising-enquiry" className="mt-8 scroll-mt-8">
          <MerchantAdvertisingEnquiryForm />
        </div>

        <article className="mt-8 rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            Future
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Sell with Family Fun</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {sellEnabled
              ? "Sell with Family Fun 已啟用。活動可按平台設定使用 Family Fun ticketing / checkout。"
              : "現階段活動報名及付款仍連到主辦方自己的官方網址。當平台有足夠家長流量及活躍商戶後，才會啟用 Sell with Family Fun，加入平台 checkout、訂單、電子票、佣金及商戶 payout。"}
          </p>
          <p className="mt-3 text-sm font-black text-blue-900">
            目前狀態：{sellEnabled ? "Enabled" : "Not enabled — architecture reserved for later rollout"}
          </p>
        </article>
      </section>
    </main>
  );
}

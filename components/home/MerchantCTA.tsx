import Link from "next/link";
import { MessageCircle, Store } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/utils";

export function MerchantCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 p-8 text-white shadow-lg sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
              <Store size={16} />
              商戶夥伴計劃
            </div>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
              想讓更多家庭認識你的活動？
            </h2>
            <p className="text-primary-100">
              免費登記即可上架活動，我們亦提供 WhatsApp 協助，幫你快速完成發佈。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/merchant-join"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              商戶免費登記
            </Link>
            <a
              href={getWhatsAppUrl("你好，我想查詢商戶上架方案。")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <MessageCircle size={18} />
              WhatsApp 協助上架
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

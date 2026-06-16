"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Store,
  Upload,
} from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/constants";
import { getWhatsAppUrl } from "@/lib/utils";

const requiredFields = [
  { name: "eventLink", label: "網站 / 活動連結", type: "url", placeholder: "https://..." },
  { name: "merchantName", label: "商戶名稱", type: "text", placeholder: "你的機構或商戶名稱" },
  { name: "phone", label: "聯絡電話", type: "tel", placeholder: "例如：9123 4567" },
  { name: "email", label: "電郵地址", type: "email", placeholder: "your@email.com" },
  { name: "eventName", label: "活動名稱", type: "text", placeholder: "活動全名" },
  { name: "address", label: "活動地址", type: "text", placeholder: "完整地址" },
  { name: "date", label: "活動日期", type: "date" },
  { name: "time", label: "活動時間", type: "text", placeholder: "例如：14:00 - 16:00" },
  { name: "price", label: "票價（如有）", type: "text", placeholder: "例如：HK$200 / 人，或留空表示免費" },
] as const;

export default function MerchantJoinPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pb-16">
      <section className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-primary-700 shadow-sm">
              <Store size={16} />
              商戶夥伴計劃
            </span>
            <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              商戶免費登記
            </h1>
            <p className="text-lg text-gray-600">
              填寫以下資料即可提交活動上架申請。我們團隊會在 1-2 個工作天內與你聯絡確認。
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <Link
            href="#submit-form"
            className="rounded-2xl border border-primary-200 bg-primary-50 p-5 text-center transition hover:shadow-md"
          >
            <Store className="mx-auto mb-2 text-primary-600" size={28} />
            <p className="font-semibold text-gray-900">商戶免費登記</p>
            <p className="mt-1 text-sm text-gray-600">填寫表格提交活動</p>
          </Link>
          <a
            href={getWhatsAppUrl("你好，我需要 WhatsApp 協助上架活動。")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center transition hover:shadow-md"
          >
            <MessageCircle className="mx-auto mb-2 text-green-600" size={28} />
            <p className="font-semibold text-gray-900">WhatsApp 協助上架</p>
            <p className="mt-1 text-sm text-gray-600">5701 8297</p>
          </a>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center card-shadow">
            <Mail className="mx-auto mb-2 text-secondary-600" size={28} />
            <p className="font-semibold text-gray-900">查看商戶方案</p>
            <p className="mt-1 text-sm text-gray-600">現階段免費上架</p>
          </div>
        </div>

        <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
          <h2 className="mb-4 text-lg font-bold text-gray-900">聯絡方式</h2>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <a
              href={getWhatsAppUrl("你好，我想查詢商戶上架。")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-700 hover:underline"
            >
              <Phone size={16} />
              WhatsApp: 5701 8297
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-primary-600 hover:underline"
            >
              <Mail size={16} />
              Email: {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div id="submit-form" className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 text-green-600" size={48} />
                <h2 className="mb-2 text-xl font-bold text-gray-900">提交成功！</h2>
                <p className="text-gray-600">
                  我們已收到你的申請（模擬提交，Phase 1A 尚未連接後端）。
                  如需即時協助，請透過 WhatsApp 5701 8297 聯絡我們。
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow sm:p-8"
              >
                <h2 className="mb-2 text-xl font-bold text-gray-900">提交活動資料</h2>
                <p className="mb-6 text-sm text-gray-500">
                  標有 * 的欄位為必填。活動圖片最多上傳 5 張。
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  {requiredFields.map((field) => (
                    <label
                      key={field.name}
                      className={
                        field.name === "eventLink" || field.name === "address"
                          ? "block sm:col-span-2"
                          : "block"
                      }
                    >
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.name !== "price" && " *"}
                      </span>
                      <input
                        type={field.type}
                        name={field.name}
                        required={field.name !== "price"}
                        placeholder={"placeholder" in field ? field.placeholder : undefined}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    活動圖片（最多 5 張）*
                  </span>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 transition hover:border-primary-300 hover:bg-primary-50/30">
                    <Upload className="mb-2 text-gray-400" size={32} />
                    <span className="text-sm font-medium text-gray-700">
                      點擊或拖放圖片到此處
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      支援 JPG、PNG，最多 5 張（UI 展示，尚未上傳）
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={() => {}}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 sm:w-auto"
                >
                  提交申請
                </button>
              </form>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h3 className="mb-4 font-bold text-gray-900">需要提交嘅資料</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 網站 / 活動連結</li>
                <li>• 活動圖片（最多 5 張）</li>
                <li>• 商戶名稱</li>
                <li>• 聯絡電話及電郵</li>
                <li>• 活動名稱、地址</li>
                <li>• 活動日期及時間</li>
                <li>• 票價（如有）</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white">
              <h3 className="mb-2 font-bold">想直接聯絡？</h3>
              <p className="mb-4 text-sm text-primary-100">
                直接 WhatsApp 我哋，我哋可以幫你快速上架活動。
              </p>
              <a
                href={getWhatsAppUrl("你好，我想透過 WhatsApp 協助上架活動。")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700"
              >
                <MessageCircle size={16} />
                WhatsApp 5701 8297
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

const text: Record<AppLocale, {title:string;body:string;mandatory:string;links:string}> = {
  "zh-Hant": {
    title: "收集個人資料通知",
    body: "營運方 Peyto Dev Hub Limited 會使用所收集的電郵、聯絡人、商戶資料及登入識別資料建立帳戶、審批活動、發送必要通知及維護保安。所需資料可能交予身份認證、雲端寄存、電郵服務供應商及依法獲授權機關；獲批准的活動和商戶公開資料可展示於網站。",
    mandatory: "標示 * 的欄位及條款同意屬必要資料；其他欄位一般可自選。不提供必要資料可能無法建立帳戶。你可要求查閱或更正資料，請電郵 info@hkfamilyfun.com。註冊不代表同意市場推廣。",
    links: "請閱讀私隱政策及商戶條款"
  },
  "zh-Hans": {
    title: "个人资料收集通知",
    body: "营运方 Peyto Dev Hub Limited 会使用所收集的邮箱、联系人、商户资料及登录识别资料建立账户、审核活动、发送必要通知及维护安全。所需资料可能交予身份认证、云端托管、邮件服务供应商及依法获授权机关；获批准的活动及商户公开资料可展示于网站。",
    mandatory: "标注 * 的字段及条款同意属于必要资料；其他字段一般自愿提供。缺少必要资料可能无法建立账户。你可以要求查阅或更正资料，请发送邮件至 info@hkfamilyfun.com。注册不代表同意接收营销信息。",
    links: "请阅读隐私政策及商户条款"
  },
  "en": {
    title: "Personal Information Collection Notice",
    body: "Peyto Dev Hub Limited uses your email, contact details, merchant information and authentication identifiers to create accounts, review listings, send necessary service messages and protect security. Necessary information may be shared with authentication, hosting and email providers and legally authorized authorities; approved public merchant and event details may appear on the website.",
    mandatory: "Fields marked * and acceptance of applicable terms are required; other fields are generally optional. Without required information you may not be able to register. You may request access or correction by emailing info@hkfamilyfun.com. Registration is not consent to receive direct marketing.",
    links: "Read our Privacy Policy and Merchant Terms"
  }
};

export default function MerchantCollectionNotice() {
  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  useEffect(() => {
    let mounted = true;
    void fetch("/api/locale", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { locale?: string } | null) => {
        if (!mounted) return;
        if (data?.locale === "en" || data?.locale === "zh-Hans" || data?.locale === "zh-Hant") {
          setLocale(data.locale);
        }
      })
      .catch(() => { /* Keep Traditional Chinese fallback. */ });
    return () => { mounted = false; };
  }, []);
  const c = text[locale];
  return <section aria-label={c.title} className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-xs leading-6 text-slate-700">
    <h2 className="text-sm font-bold text-purple-900">{c.title}</h2>
    <p className="mt-2">{c.body}</p>
    <p className="mt-2">{c.mandatory}</p>
    <p className="mt-2 font-semibold text-purple-800">{c.links}：
      <Link href="/privacy" target="_blank" className="ml-2 underline">Privacy</Link>
      <Link href="/merchant-terms" target="_blank" className="ml-2 underline">Merchant Terms</Link>
    </p>
  </section>;
}

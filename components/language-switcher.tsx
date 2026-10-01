"use client";

import { useState } from "react";
import {
  SUPPORTED_LOCALES,
  localeLabel,
  type AppLocale,
} from "@/lib/i18n/config";

export default function LanguageSwitcher({
  locale,
  label,
}: {
  locale: AppLocale;
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale || busy) return;

    setBusy(true);

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (!response.ok) {
        setBusy(false);
        return;
      }

      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      aria-label={label}
    >
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => changeLocale(item)}
          disabled={busy}
          aria-pressed={item === locale}
          className={[
            "min-w-9 rounded-full px-2.5 py-1.5 text-xs font-black transition",
            item === locale
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
          ].join(" ")}
        >
          {localeLabel(item)}
        </button>
      ))}
    </div>
  );
}

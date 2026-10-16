"use client";

import { useEffect, useState } from "react";
import { X, Monitor, Smartphone, ImageOff, CheckCircle2 } from "lucide-react";

export type BannerPreviewData = {
  internal_name: string;
  headline_tc: string;
  headline_en?: string | null;
  subheadline_tc?: string | null;
  image_url?: string | null;
  mobile_image_url?: string | null;
  target_url?: string | null;
  cta_label_tc?: string | null;
  badge_text_tc?: string | null;
  sponsor_name?: string | null;
  is_paid?: boolean | null;
  status: string;
  placement: string;
};

type PreviewProps = {
  banner: BannerPreviewData;
  placementLabel: string;
  mode: "view" | "save" | "activate";
  confirming: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

// Render a non-interactive preview so the review itself never generates an
// impression, triggers a click-through, or changes the existing banner status.
function BannerMockup({
  banner, image, mobile, onImageState,
}: {
  banner: BannerPreviewData;
  image: string;
  mobile: boolean;
  onImageState: (state: "loaded" | "error") => void;
}) {
  return (
    <div className={mobile ? "mx-auto w-full max-w-[345px]" : "w-full"}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
        {mobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        {mobile ? "Mobile · 手機版" : "Desktop · 桌面版"}
      </div>
      <article className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-md">
        {image ? (
          // Plain img matches public Banner and allows load/error verification.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image}
            src={image}
            alt={banner.headline_tc}
            className={mobile ? "h-64 w-full object-cover" : "h-72 w-full object-cover"}
            onLoad={() => onImageState("loaded")}
            onError={() => onImageState("error")}
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-white/65">
            <ImageOff className="mr-2 h-5 w-5" /> 尚未上傳圖片
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex flex-wrap items-center gap-2">
            {banner.badge_text_tc && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
                {banner.badge_text_tc}
              </span>
            )}
            {banner.is_paid && (
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-700">Sponsored</span>
            )}
          </div>
          <h3 className="mt-3 break-words text-xl font-black leading-tight">{banner.headline_tc || "尚未輸入 Banner 標題"}</h3>
          {banner.subheadline_tc && (
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-white/85">{banner.subheadline_tc}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
              {banner.cta_label_tc || "了解更多"}
            </span>
            {banner.sponsor_name && <span className="text-xs font-bold text-white/70">{banner.sponsor_name}</span>}
          </div>
        </div>
      </article>
    </div>
  );
}

export default function BannerApprovalPreview({
  banner, placementLabel, mode, confirming, onClose, onConfirm,
}: PreviewProps) {
  const [desktop, setDesktop] = useState<"loading" | "loaded" | "error">("loading");
  const [mobile, setMobile] = useState<"loading" | "loaded" | "error">("loading");
  const desktopSrc = banner.image_url?.trim() || "";
  const mobileSrc = banner.mobile_image_url?.trim() || desktopSrc;
  useEffect(() => { setDesktop(desktopSrc ? "loading" : "error"); }, [desktopSrc]);
  useEffect(() => { setMobile(mobileSrc ? "loading" : "error"); }, [mobileSrc]);
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, confirming]);
  const ready = Boolean(desktopSrc && mobileSrc && desktop === "loaded" && mobile === "loaded");
  const actionText = mode === "activate" ? "確認啟用 Banner" : "確認儲存 Banner";
  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/75 px-3 py-6 sm:px-6" role="presentation">
      <section
        role="dialog" aria-modal="true" aria-label="Banner 圖片與版面預覽"
        className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-purple-700">Banner Review · 不會自動公開</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">確認圖片、文字及版位</h2>
            <p className="mt-1 text-sm text-slate-600">
              {banner.internal_name || "未命名 Campaign"} · {placementLabel} · {banner.status.toUpperCase()}
            </p>
          </div>
          <button type="button" aria-label="關閉預覽" disabled={confirming} onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
          <BannerMockup banner={banner} image={desktopSrc} mobile={false} onImageState={setDesktop}/>
          <BannerMockup banner={banner} image={mobileSrc} mobile onImageState={setMobile}/>
        </div>
        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-2">
          <p><strong>Desktop 圖片：</strong>{desktop === "loaded" ? "正常顯示" : desktop === "error" ? "讀取失敗／未設定" : "檢查中…"}</p>
          <p><strong>Mobile 圖片：</strong>{mobile === "loaded" ? "正常顯示" : mobile === "error" ? "讀取失敗／未設定" : "檢查中…"}</p>
          <p className="break-all sm:col-span-2"><strong>點擊目標：</strong>{banner.target_url || "未設定；沒有外部連結"}</p>
          {banner.headline_en && <p className="sm:col-span-2"><strong>英文標題：</strong>{banner.headline_en}</p>}
          <p className="sm:col-span-2 text-slate-500">此為前台 Banner 版面模擬。圖片及文字應於桌面與手機預覽確認無遮擋後才儲存或啟用。</p>
        </div>
        {(desktop === "error" || mobile === "error") && (
          <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            圖片未能正常顯示。請返回修改圖片 URL 或重新上傳，再預覽。
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button type="button" disabled={confirming} onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            {mode === "view" ? "關閉預覽" : "返回修改"}
          </button>
          {mode !== "view" && onConfirm && (
            <button type="button" disabled={confirming || !ready} onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-45">
              {confirming ? "處理中…" : ready ? <><CheckCircle2 className="h-4 w-4"/>{actionText}</> : "等待圖片完成檢查"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

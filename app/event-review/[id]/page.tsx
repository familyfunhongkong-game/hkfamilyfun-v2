import { serviceClient } from "@/lib/admin-auth";
import { verifyEventReviewToken } from "@/lib/event-review-token";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    expires?: string;
    sig?: string;
    result?: string;
    missing?: string;
    mode?: string;
  }>;
};

function field(value: unknown) {
  return String(value ?? "").trim();
}

function statusMessage(result?: string, missing?: string) {
  if (result === "saved") return { tone: "green", text: "修改已儲存。" };
  if (result === "approved") return { tone: "green", text: "活動已批准，尚未公開。" };
  if (result === "published") return { tone: "green", text: "活動已正式發布。" };
  if (result === "rejected") return { tone: "amber", text: "活動已退回，不會公開。" };
  if (result === "note-required") return { tone: "amber", text: "退回活動前請先填寫審批備註。" };
  if (result === "blocked") return { tone: "amber", text: "未能發布，請先補齊：" + (missing || "必要資料") };
  return null;
}

export default async function EventReviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const expires = field(query.expires);
  const sig = field(query.sig);
  const editMode = query.mode === "edit";

  if (!verifyEventReviewToken(id, expires, sig)) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-2xl font-black text-rose-900">Review 連結已失效</h1>
          <p className="mt-3 leading-7 text-rose-800">
            此安全連結無效或已過期。請使用最新 HK Family Fun 審批電郵內的連結。
          </p>
        </div>
      </main>
    );
  }

  const admin = serviceClient();
  if (!admin) {
    return <main className="mx-auto max-w-3xl px-5 py-16">暫時未能載入活動。</main>;
  }

  const { data: event } = await admin.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) {
    return <main className="mx-auto max-w-3xl px-5 py-16">找不到活動。</main>;
  }

  const message = statusMessage(query.result, query.missing);
  const hidden = (
    <>
      <input type="hidden" name="event_id" value={id} />
      <input type="hidden" name="expires" value={expires} />
      <input type="hidden" name="sig" value={sig} />
    </>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-purple-700">HK Family Fun</p>
            <h1 className="mt-1 text-3xl font-black">活動 Review</h1>
            <p className="mt-2 text-sm text-slate-600">
              安全電郵審批頁；毋須登入 Admin。請核對資料後直接批准或發布；修改內容會一併儲存。
            </p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black ring-1 ring-slate-200">
            {field(event.status) || "draft"}
          </span>
        </div>

        {message ? (
          <div className={[
            "mb-5 rounded-2xl border p-4 text-sm font-bold",
            message.tone === "green"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800",
          ].join(" ")}>
            {message.text}
          </div>
        ) : null}

        <section className="mb-6 rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">選擇審批方式</h2>
          <p className="mt-2 text-sm text-slate-600">直接批准會驗證必填資料並正式發布；如資料不足，系統會提示你先修改。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form method="post" action="/api/event-review">
              {hidden}
              <button type="submit" name="action" value="publish" disabled={["published", "rejected"].includes(field(event.status))} className="w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white disabled:opacity-50">直接批准並發布</button>
            </form>
            <a href={`/event-review/${encodeURIComponent(id)}?expires=${encodeURIComponent(expires)}&sig=${encodeURIComponent(sig)}&mode=edit`} className="flex items-center justify-center rounded-2xl bg-purple-700 px-5 py-4 text-center font-black text-white">查看詳情 / 修改後批准</a>
          </div>
          {field(event.status) === "approved" ? <p className="mt-3 text-sm font-bold text-amber-800">已批准，尚未公開。如要正式發布，請進入詳情審批。</p> : null}
        </section>

        {editMode ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            {field(event.cover_image_url) ? (
              <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={field(event.cover_image_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="mb-5 flex aspect-[16/9] items-center justify-center rounded-2xl bg-purple-50 text-2xl font-black text-purple-600">
                HK Family Fun
              </div>
            )}

            <form id="event-review-form" method="post" action="/api/event-review" className="space-y-4">
              {hidden}
              <label className="block text-sm font-black">
                活動名稱
                <input name="title_tc" defaultValue={field(event.title_tc || event.title)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" />
              </label>

              <label className="block text-sm font-black">
                活動介紹
                <textarea name="description_tc" defaultValue={field(event.description_tc)} rows={7} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium leading-6" />
              </label>

              <label className="block text-sm font-black">
                亮點
                <textarea name="highlights" defaultValue={field(event.highlights)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium leading-6" />
              </label>

              <label className="block text-sm font-black">
                注意事項 / 條款
                <textarea name="terms" defaultValue={field(event.terms || event.remarks)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium leading-6" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-black">
                  家長提示
                  <textarea name="parent_note_tc" defaultValue={field(event.parent_note_tc)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" />
                </label>
                <label className="block text-sm font-black">
                  安全 / 天氣提示
                  <textarea name="safety_note_tc" defaultValue={field(event.safety_note_tc)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-black">開始日期<input type="date" name="start_date" defaultValue={field(event.start_date)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
                <label className="block text-sm font-black">結束日期<input type="date" name="end_date" defaultValue={field(event.end_date)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
                <label className="block text-sm font-black">開始時間<input type="time" name="start_time" defaultValue={field(event.start_time).slice(0,5)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
                <label className="block text-sm font-black">結束時間<input type="time" name="end_time" defaultValue={field(event.end_time).slice(0,5)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-black">場地<input name="venue_name" defaultValue={field(event.venue_name)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
                <label className="block text-sm font-black">主辦方<input name="organizer_name" defaultValue={field(event.organizer_name)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              </div>

              <label className="block text-sm font-black">地址<input name="address" defaultValue={field(event.address)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-black">
                  收費類型
                  <select name="price_display_mode" defaultValue={field(event.price_display_mode) || "unknown"} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium">
                    <option value="unknown">待確認</option>
                    <option value="free">免費</option>
                    <option value="fixed">固定收費</option>
                    <option value="from">由某價起</option>
                    <option value="range">價錢範圍</option>
                    <option value="hidden">不顯示價錢</option>
                  </select>
                </label>
                <label className="block text-sm font-black">收費顯示<input name="price_label" defaultValue={field(event.price_label)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              </div>
              <label className="block text-sm font-black">封面圖片 URL<input name="cover_image_url" defaultValue={field(event.cover_image_url)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              <label className="block text-sm font-black">報名連結<input name="registration_url" defaultValue={field(event.registration_url)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>
              <label className="block text-sm font-black">官方來源<input name="official_url" defaultValue={field(event.official_url || event.source_url)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium" /></label>

              <button name="action" value="save" className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
                儲存修改
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-black">審批</h2>
              <div className="mt-4 space-y-3">
                {hidden}
                <textarea form="event-review-form" name="admin_note" rows={4} placeholder="可選：審批備註；退回時必填。" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <button form="event-review-form" name="action" value="publish" className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white">
                  批准並正式發布
                </button>
                <button form="event-review-form" name="action" value="approve" className="w-full rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white">
                  只批准，暫不公開
                </button>
                <button form="event-review-form" name="action" value="reject" className="w-full rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700">
                  退回 / 不發布
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-purple-50 p-5 ring-1 ring-purple-100">
              <h2 className="font-black text-purple-950">核對來源</h2>
              <p className="mt-2 text-sm leading-6 text-purple-800">
                發布前請特別確認日期、時間、收費、報名方法及圖片是否仍然有效。
              </p>
              {field(event.source_url || event.official_url) ? (
                <a href={field(event.source_url || event.official_url)} target="_blank" rel="noreferrer" className="mt-4 inline-block font-black text-purple-700 underline">
                  開啟官方來源
                </a>
              ) : null}
            </section>
          </aside>
        </div>
        ) : null}
      </div>
    </main>
  );
}

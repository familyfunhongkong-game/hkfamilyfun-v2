"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { forgetLocalFavoritesOnLogout, synchronizeCloudFavorites } from "@/lib/favorites/cloud-sync";

const categoryOptions = ["", "展覽", "藝術文化", "工作坊", "免費活動", "戶外活動", "室內活動", "SEN 友善", "親子市集", "其他"];
export default function ParentAccountPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteDistrict, setFavoriteDistrict] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { if (alive) { setError("會員登入服務未設定。"); setLoading(false); } return; }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !auth.user) { setLoading(false); return; }
      setUserId(auth.user.id); setEmail(auth.user.email || "");
      const { data, error: preferenceError } = await supabase.from("user_event_preferences")
        .select("favorite_district,free_only,preferred_category").eq("user_id",auth.user.id).maybeSingle();
      if (!alive) return;
      if (preferenceError) setError("暫時無法讀取會員偏好；請稍後重試。");
      else if (data) {
        setFavoriteDistrict(data.favorite_district || "");
        setFreeOnly(Boolean(data.free_only));
        setCategory(data.preferred_category || "");
      }
      const synced = await synchronizeCloudFavorites();
      if (!alive) return;
      setSavedCount(synced.count);
      if (synced.error) setError(synced.error);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) { setError("請先登入會員。"); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: failure } = await supabase.from("user_event_preferences").upsert({
      user_id: userId,
      favorite_district: favoriteDistrict.trim().slice(0, 80),
      free_only: freeOnly,
      preferred_category: category,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (failure) setError("未能儲存偏好，請稍後再試。");
    else setNotice("會員偏好已安全儲存到帳戶。");
    setBusy(false);
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error: failure } = await supabase.auth.signOut();
    if (failure) setError("登出失敗。");
    else {
      forgetLocalFavoritesOnLogout();
      setEmail(""); setUserId(""); setSavedCount(null);
      setNotice("已登出，本機會員收藏快取已清除。");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-3xl font-black text-slate-950">HK Family Fun 會員中心</h1>
        {loading ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">載入會員資料中…</p> :
          userId ? (
            <>
              <section className="rounded-2xl border border-purple-200 bg-white p-5">
                <p className="text-sm text-slate-600">已登入：<strong className="text-slate-950">{email}</strong></p>
                <p className="mt-2 text-sm text-purple-800">雲端收藏：{savedCount === null ? "載入中" : savedCount + " 項"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/favorites" className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white">查看收藏</Link>
                  <Link href="/calendar" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold">活動日曆</Link>
                  <button type="button" disabled={busy} onClick={() => void logout()}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50">登出</button>
                </div>
              </section>
              <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <h2 className="text-xl font-black">我的活動偏好</h2>
                <p className="text-sm leading-6 text-slate-600">偏好只儲存在你自己嘅會員帳戶，其他會員無權讀取。</p>
                <label className="block text-sm font-bold">常用地區
                  <input value={favoriteDistrict} maxLength={80} onChange={(event) => setFavoriteDistrict(event.target.value)}
                    placeholder="例如：沙田區、九龍城區、離島區" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base"/>
                </label>
                <label className="block text-sm font-bold">活動興趣
                  <select value={category} onChange={(event) => setCategory(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base">
                    {categoryOptions.map((value) => <option value={value} key={value}>{value || "全部活動"}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold">
                  <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)}/>
                  優先關注免費活動
                </label>
                <button type="submit" disabled={busy} className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {busy ? "儲存中…" : "儲存我的偏好"}
                </button>
              </form>
            </>
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-white p-5">
              <p className="text-sm text-slate-700">請先登入或免費建立會員帳戶，先可以跨裝置保留收藏及偏好。</p>
              <Link href="/login" className="mt-3 inline-flex rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white">家長免費登入／註冊</Link>
            </section>
          )}
        {notice ? <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p> : null}
        {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : null}
      </div>
    </main>
  );
}

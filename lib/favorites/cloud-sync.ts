import { supabase } from "@/lib/supabase/client";

export const SAVED_EVENT_KEY = "hkff_favorite_event_ids";
export const SAVED_CHANGED = "hkff:favorites-changed";
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDS = 500;
const importedKey = (userId: string) => "hkff:cloud-imported:" + userId;
const lastMemberKey = "hkff:last-cloud-member";

export function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_EVENT_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter((x): x is string => typeof x === "string" && idPattern.test(x)))).slice(0, MAX_IDS);
  } catch { return []; }
}

export function publishSavedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  const clean = Array.from(new Set(ids.filter((id) => idPattern.test(id)))).slice(0, MAX_IDS);
  localStorage.setItem(SAVED_EVENT_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent(SAVED_CHANGED));
}

export type CloudSyncResult = { loggedIn: boolean; count: number; error?: string };
let running: Promise<CloudSyncResult> | null = null;
// Invalidated synchronously on sign-out or account change; a pending network
// response must never repopulate another person's bookmark cache.
let sessionGeneration = 0;
export function invalidateCloudFavoriteSession() {
  sessionGeneration += 1;
  running = null;
}


/** Initial login imports guest bookmarks once, then cloud is authoritative.
 * On future sign-ins, deleted cloud bookmarks are never resurrected from a
 * stale copy on another device. On logout clear the shared browser key. */
export function synchronizeCloudFavorites(): Promise<CloudSyncResult> {
  if (running) return running;
  const generation = sessionGeneration;
  const task = async (): Promise<CloudSyncResult> => {
    const cancelled = () => generation !== sessionGeneration;

    if (!supabase) return { loggedIn: false, count: readSavedIds().length, error: "會員資料庫未設定" };
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) return { loggedIn: false, count: readSavedIds().length, error: "無法驗證會員登入" };
    if (!user) return { loggedIn: false, count: readSavedIds().length };
    if (cancelled()) return { loggedIn: false, count: 0, error: "會員登入狀態已變更，請重新同步" };
    // Protect shared devices: an account switch must never import another
    // person's offline favorites into this user's private cloud list.
    const previousMember = localStorage.getItem(lastMemberKey);
    if (previousMember && previousMember !== user.id) publishSavedIds([]);
    const { data: rows, error: fetchError } = await supabase.from("user_saved_events")
      .select("event_id").eq("user_id", user.id).order("created_at", { ascending: true }).limit(MAX_IDS);
    if (fetchError) return { loggedIn: true, count: readSavedIds().length, error: "雲端收藏暫時無法連線" };
    if (cancelled()) return { loggedIn: false, count: 0, error: "同步途中會員登入狀態已變更" };
    let cloudIds = (rows || []).map((row: { event_id: string }) => row.event_id).filter((id) => idPattern.test(id));
    const isFirstImport = localStorage.getItem(importedKey(user.id)) !== "1";
    if (isFirstImport) {
      const guestIds = readSavedIds();
      const toAdd = guestIds.filter((id) => !cloudIds.includes(id)).slice(0, MAX_IDS - cloudIds.length);
      if (toAdd.length) {
        for (let offset = 0; offset < toAdd.length; offset += 50) {
          const batch = toAdd.slice(offset, offset + 50).map((event_id) => ({ user_id: user.id, event_id }));
          const { error } = await supabase.from("user_saved_events")
            .upsert(batch, { onConflict: "user_id,event_id", ignoreDuplicates: true });
          if (error) return { loggedIn: true, count: readSavedIds().length, error: "舊收藏同步失敗，已保留本機資料" };
          if (cancelled()) return { loggedIn: false, count: 0, error: "同步途中會員登入狀態已變更" };
        }
        cloudIds = Array.from(new Set([...cloudIds, ...toAdd]));
      }
      localStorage.setItem(importedKey(user.id), "1");
    }
    // Final identity check is necessary even when no sign-out callback fired:
    // users can switch sessions while a remote Supabase query is pending.
    const { data: latest } = await supabase.auth.getUser();
    if (cancelled() || latest.user?.id !== user.id) {
      return { loggedIn: false, count: 0, error: "同步途中會員登入狀態已變更" };
    }
    localStorage.setItem(lastMemberKey, user.id);
    publishSavedIds(cloudIds);
    return { loggedIn: true, count: cloudIds.length };
  };
  const thisRun = task().finally(() => {
    if (running === thisRun) running = null;
  });
  running = thisRun;
  return running;
}

export async function changeSavedEvent(eventId: string, save: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!idPattern.test(eventId)) return { ok: false, error: "活動 ID 無效" };
  if (!supabase) {
    const ids = readSavedIds();
    const next = save ? Array.from(new Set([...ids, eventId])) : ids.filter((id) => id !== eventId);
    if (next.length > MAX_IDS) return { ok: false, error: "收藏上限為 500 項" };
    publishSavedIds(next);
    return { ok: true };
  }
  const changeGeneration = sessionGeneration;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { ok: false, error: "登入驗證失敗，請稍後再試" };
  // Wait for initial guest import/cloud fetch before applying any new save.
  if (user) {
    const synced = await synchronizeCloudFavorites();
    if (synced.error) return { ok: false, error: synced.error };
    const { data: current } = await supabase.auth.getUser();
    if (current.user?.id !== user.id) return { ok: false, error: "登入狀態已變更，請重試收藏" };
  }
  const previous = readSavedIds();
  const next = save ? Array.from(new Set([...previous, eventId])) : previous.filter((id) => id !== eventId);
  if (next.length > MAX_IDS) return { ok: false, error: "收藏上限為 500 項" };
  if (changeGeneration !== sessionGeneration) return { ok: false, error: "會員已登出，請重試" };
  publishSavedIds(next);
  if (!user) return { ok: true };
  const result = save
    ? await supabase.from("user_saved_events").upsert(
        { user_id: user.id, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true })
    : await supabase.from("user_saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
  if (result.error) {
    // A failed save from an old signed-out session must never restore that
    // account's local favorites on a shared device.
    if (changeGeneration === sessionGeneration) publishSavedIds(previous);
    return { ok: false, error: "雲端收藏未能儲存，請重新整理後重試" };
  }
  if (changeGeneration !== sessionGeneration) return { ok: false, error: "會員已登出，請重試" };
  return { ok: true };
}

export function forgetLocalFavoritesOnLogout() {
  if (typeof window === "undefined") return;
  invalidateCloudFavoriteSession();
  const previousMember = localStorage.getItem(lastMemberKey);
  if (previousMember) localStorage.removeItem(importedKey(previousMember));
  localStorage.removeItem(SAVED_EVENT_KEY);
  localStorage.removeItem(lastMemberKey);
  window.dispatchEvent(new CustomEvent(SAVED_CHANGED));
}

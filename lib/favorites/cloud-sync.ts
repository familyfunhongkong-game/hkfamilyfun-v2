import { supabase } from "@/lib/supabase/client";

export const SAVED_EVENT_KEY = "hkff_favorite_event_ids";
export const SAVED_CHANGED = "hkff:favorites-changed";
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDS = 500;
const importedKey = (userId: string) => "hkff:cloud-imported:" + userId;

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

/** Initial login imports guest bookmarks once, then cloud is authoritative.
 * On future sign-ins, deleted cloud bookmarks are never resurrected from a
 * stale copy on another device. On logout clear the shared browser key. */
export function synchronizeCloudFavorites(): Promise<CloudSyncResult> {
  if (running) return running;
  const task = async (): Promise<CloudSyncResult> => {
    if (!supabase) return { loggedIn: false, count: readSavedIds().length, error: "會員資料庫未設定" };
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) return { loggedIn: false, count: readSavedIds().length, error: "無法驗證會員登入" };
    if (!user) return { loggedIn: false, count: readSavedIds().length };
    const { data: rows, error: fetchError } = await supabase.from("user_saved_events")
      .select("event_id").eq("user_id", user.id).order("created_at", { ascending: true }).limit(MAX_IDS);
    if (fetchError) return { loggedIn: true, count: readSavedIds().length, error: "雲端收藏暫時無法連線" };
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
        }
        cloudIds = Array.from(new Set([...cloudIds, ...toAdd]));
      }
      localStorage.setItem(importedKey(user.id), "1");
    }
    publishSavedIds(cloudIds);
    return { loggedIn: true, count: cloudIds.length };
  };
  running = task().finally(() => { running = null; });
  return running;
}

export async function changeSavedEvent(eventId: string, save: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!idPattern.test(eventId)) return { ok: false, error: "活動 ID 無效" };
  const previous = readSavedIds();
  const next = save ? Array.from(new Set([...previous, eventId])) : previous.filter((id) => id !== eventId);
  if (next.length > MAX_IDS) return { ok: false, error: "收藏上限為 500 項" };
  publishSavedIds(next);
  if (!supabase) return { ok: true }; // Guest bookmark remains local.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) { publishSavedIds(previous); return { ok: false, error: "登入驗證失敗，已恢復原有收藏" }; }
  if (!user) return { ok: true };
  const result = save
    ? await supabase.from("user_saved_events").upsert(
        { user_id: user.id, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true })
    : await supabase.from("user_saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
  if (result.error) {
    publishSavedIds(previous);
    return { ok: false, error: "雲端收藏未能儲存，已回復原有狀態" };
  }
  return { ok: true };
}

export function forgetLocalFavoritesOnLogout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVED_EVENT_KEY);
  window.dispatchEvent(new CustomEvent(SAVED_CHANGED));
}

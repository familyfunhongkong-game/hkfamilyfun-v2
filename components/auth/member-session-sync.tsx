"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { forgetLocalFavoritesOnLogout, synchronizeCloudFavorites } from "@/lib/favorites/cloud-sync";

/** Keep shared-browser cache isolated when a user signs in/out on ANY page.
 * Event callback itself must not await Supabase API calls (avoids auth lock).
 */
export default function MemberSessionSync() {
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") forgetLocalFavoritesOnLogout();
      if (live && session?.user &&
          (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        Promise.resolve().then(() => {
          if (live) void synchronizeCloudFavorites();
        });
      }
    });
    return () => { live = false; listener.subscription.unsubscribe(); };
  }, []);
  return null;
}

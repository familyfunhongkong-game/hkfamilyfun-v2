"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function MerchantUpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("ç³»çµ±æš«æ™‚æœªèƒ½é€£æŽ¥å¸³æˆ¶æœå‹™ï¼Œè«‹ç¨å¾Œå†è©¦ã€‚");
      setIsChecking(false);
      return;
    }

    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(Boolean(session));
        setIsChecking(false);
      }
      if (event === "SIGNED_OUT") setHasSession(false);
    });

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(session));
      setIsChecking(false);
    };

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!supabase) {
      setErrorMessage("ç³»çµ±æš«æ™‚æœªèƒ½é€£æŽ¥å¸³æˆ¶æœå‹™ï¼Œè«‹ç¨å¾Œå†è©¦ã€‚");
      return;
    }

    if (!hasSession) {
      setErrorMessage("é‡è¨­å¯†ç¢¼é€£çµç„¡æ•ˆæˆ–å·²éŽæœŸï¼Œè«‹é‡æ–°ç”³è«‹ã€‚");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("æ–°å¯†ç¢¼æœ€å°‘éœ€è¦ 8 å€‹å­—å…ƒã€‚");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("å…©æ¬¡è¼¸å…¥çš„å¯†ç¢¼ä¸ç›¸åŒã€‚");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage("æœªèƒ½æ›´æ–°å¯†ç¢¼ã€‚è«‹é‡æ–°ç”³è«‹é‡è¨­å¯†ç¢¼é€£çµå¾Œå†è©¦ã€‚");
      return;
    }

    setSuccessMessage("å¯†ç¢¼å·²æˆåŠŸæ›´æ–°ã€‚");
    setNewPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();
    setHasSession(false);
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">HK Family Fun Merchant Portal</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">è¨­å®šæ–°å¯†ç¢¼</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">æ–°å¯†ç¢¼æœ€å°‘éœ€è¦ 8 å€‹å­—å…ƒã€‚</p>

          {isChecking ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">æ­£åœ¨é©—è­‰é‡è¨­å¯†ç¢¼é€£çµâ€¦</div>
          ) : null}

          {!isChecking && !hasSession && !successMessage ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">é‡è¨­å¯†ç¢¼é€£çµç„¡æ•ˆæˆ–å·²éŽæœŸï¼Œè«‹é‡æ–°ç”³è«‹ã€‚</div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{successMessage}</div>
          ) : null}

          {!isChecking && hasSession && !successMessage ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">æ–°å¯†ç¢¼</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">å†æ¬¡è¼¸å…¥æ–°å¯†ç¢¼</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "æ›´æ–°ä¸­â€¦" : "æ›´æ–°å¯†ç¢¼"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            {!hasSession && !successMessage ? (
              <Link href="/merchant/forgot-password" className="font-semibold text-primary-600 hover:text-primary-700">é‡æ–°ç”³è«‹é‡è¨­å¯†ç¢¼</Link>
            ) : null}
            <Link href="/merchant/login" className="font-semibold text-slate-600 hover:text-slate-900">è¿”å›žå•†æˆ¶ç™»å…¥</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

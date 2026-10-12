"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type AdminUser = {
  id: string;
  user_id?: string | null;
  email: string;
  role: "admin" | "super_admin";
  status: "active" | "disabled";
  invited_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_role_changed_at?: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeSuperAdmins = useMemo(
    () =>
      users.filter(
        (item) => item.role === "super_admin" && item.status === "active",
      ).length,
    [users],
  );

  async function getToken() {
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function loadUsers() {
    setLoading(true);
    setError("");

    const token = await getToken();
    if (!token) {
      setError("請先登入 Super Admin。");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error || "未能讀取 Admin Users。");
      setLoading(false);
      return;
    }

    setUsers(body.users || []);
    setCurrentUserId(body.currentUserId || "");
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function inviteAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const token = await getToken();
    if (!token) {
      setError("請先登入 Super Admin。");
      return;
    }

    setWorkingId("invite");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error || "Invite Admin 失敗。");
      setWorkingId("");
      return;
    }

    setEmail("");
    setRole("admin");
    setMessage(body.message || "Admin 已加入。");
    setWorkingId("");
    await loadUsers();
  }

  async function updateAdmin(
    item: AdminUser,
    patch: Partial<Pick<AdminUser, "role" | "status">>,
  ) {
    setMessage("");
    setError("");
    setWorkingId(item.id);

    const token = await getToken();
    if (!token) {
      setError("請先登入 Super Admin。");
      setWorkingId("");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: item.id, ...patch }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error || "未能更新 Admin 權限。");
      setWorkingId("");
      return;
    }

    setMessage("Admin 權限已更新。");
    setWorkingId("");
    await loadUsers();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link href="/admin" className="text-sm font-black text-purple-700">
            ← 返回 Admin
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
                Super Admin Only
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Admin Users
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Invite 新管理員、停用管理員，或將 Admin 升級 / 降級做 Super Admin。
                普通 Admin 無權新增管理員或修改角色。
              </p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm">
              <p className="font-black text-purple-900">
                Active Super Admin：{activeSuperAdmins}
              </p>
              <p className="mt-1 text-xs font-semibold text-purple-700">
                系統禁止移除最後一個 Active Super Admin
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <form
          onSubmit={inviteAdmin}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-black text-slate-950">Invite Admin User</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            新 email 會收到 Supabase invitation。已有帳戶嘅 email 會直接加入 Admin 權限。
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "admin" | "super_admin")
              }
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button
              type="submit"
              disabled={workingId === "invite"}
              className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {workingId === "invite" ? "處理中…" : "Invite"}
            </button>
          </div>
        </form>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-950">Authorized Admins</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">
              正在讀取…
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">
              暫時未有 Admin 記錄。
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((item) => {
                const isSelf = item.user_id === currentUserId;
                const isLastActiveSuper =
                  item.role === "super_admin" &&
                  item.status === "active" &&
                  activeSuperAdmins <= 1;
                const busy = workingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{item.email}</p>
                        {isSelf ? (
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-800">
                            你
                          </span>
                        ) : null}
                        <span
                          className={
                            item.role === "super_admin"
                              ? "rounded-full bg-purple-100 px-2.5 py-1 text-xs font-black text-purple-800"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700"
                          }
                        >
                          {item.role === "super_admin" ? "Super Admin" : "Admin"}
                        </span>
                        <span
                          className={
                            item.status === "active"
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800"
                              : "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800"
                          }
                        >
                          {item.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {item.user_id ? "已連結登入帳戶" : "尚未連結登入帳戶"}
                        {item.invited_at
                          ? ` · Invite/加入：${new Date(item.invited_at).toLocaleString()}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.role === "admin" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateAdmin(item, { role: "super_admin" })}
                          className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-black text-purple-800 disabled:opacity-50"
                        >
                          升級 Super Admin
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || isLastActiveSuper}
                          onClick={() => void updateAdmin(item, { role: "admin" })}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-40"
                        >
                          降級 Admin
                        </button>
                      )}

                      {item.status === "active" ? (
                        <button
                          type="button"
                          disabled={busy || isLastActiveSuper}
                          onClick={() => void updateAdmin(item, { status: "disabled" })}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-800 disabled:opacity-40"
                        >
                          停用
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateAdmin(item, { status: "active" })}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800 disabled:opacity-50"
                        >
                          啟用
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <p className="font-black">Security rules</p>
          <p className="mt-2">
            Admin 管理權限只由 Super Admin API 處理；前端無直接寫入 admin_users 權限。
            一般 Admin、Merchant、普通登入帳戶都無法將自己升權。最後一個 Active Super Admin
            亦不可被降級或停用。
          </p>
        </div>
      </section>
    </main>
  );
}

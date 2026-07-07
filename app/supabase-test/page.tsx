import {
    isSupabaseConfigured,
    supabase,
  } from "@/lib/supabase/client";
  
  export const dynamic = "force-dynamic";
  
  export default async function SupabaseTestPage() {
    if (!isSupabaseConfigured || !supabase) {
      return (
        <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
          <h1>Supabase 未連接</h1>
          <p>請檢查 .env.local 的 Project URL 和 Publishable key。</p>
        </main>
      );
    }
  
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title_tc, district, start_date, status")
      .eq("status", "published")
      .order("start_date", { ascending: true });
  
    if (error) {
      return (
        <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
          <h1>Supabase 讀取失敗</h1>
          <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
            {error.message}
          </pre>
        </main>
      );
    }
  
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <h1>Supabase 已連接</h1>
        <p>已讀取 {events?.length ?? 0} 個已發佈活動。</p>
  
        <ol>
          {events?.map((event) => (
            <li key={event.id} style={{ marginBottom: 12 }}>
              <strong>{event.title_tc}</strong>
              <br />
              {event.district} · {event.start_date}
            </li>
          ))}
        </ol>
      </main>
    );
  }
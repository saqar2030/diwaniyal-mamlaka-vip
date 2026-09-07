import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/BottomNav";
import { Search } from "lucide-react";
import { isOnline } from "@/lib/queries";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "بحث عن عضو | ديوانية المملكة" },
      { name: "description", content: "ابحث عن أي عضو في ديوانية المملكة برقم الآيدي أو الاسم." },
      { property: "og:title", content: "بحث عن عضو في ديوانية المملكة" },
      { property: "og:description", content: "ابحث برقم الآيدي أو الاسم واعرف حالة الاتصال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  async function run() {
    const term = q.trim();
    if (!term) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_id, avatar_url, last_seen_at")
      .or(`display_id.eq.${term},username.ilike.%${term}%`)
      .limit(20);
    setResults(data ?? []);
    setSearched(true);
  }

  return (
    <AppShell title="بحث">
      <div className="space-y-3 px-4 py-4">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="ابحث برقم الآيدي أو الاسم"
            className="flex-1 rounded-full border border-border bg-input px-4 py-2 text-xs outline-none focus:border-primary"
          />
          <button onClick={run} className="rounded-full bg-primary p-2.5 text-primary-foreground">
            <Search className="h-4 w-4" />
          </button>
        </div>

        {results.map((p) => (
          <Link
            key={p.id}
            to="/profile/$userId"
            params={{ userId: p.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {p.avatar_url ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" /> : "👤"}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black">{p.username}</p>
              <p className="text-[10px] text-muted-foreground">ID: {p.display_id}</p>
            </div>
            <span className={`text-[10px] font-black ${isOnline(p.last_seen_at) ? "text-emerald-400" : "text-muted-foreground"}`}>
              {isOnline(p.last_seen_at) ? "متصل الآن" : "غير متصل"}
            </span>
          </Link>
        ))}

        {searched && results.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">لا توجد نتائج.</p>
        )}
      </div>
    </AppShell>
  );
}

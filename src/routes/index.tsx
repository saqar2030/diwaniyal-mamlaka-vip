import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchRooms, fetchTopSupporters, formatCoins } from "@/lib/queries";
import { Plus, Mic, Crown, Trophy, Search } from "lucide-react";
import UserLevels from "../../components/UserLevels";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ديوانية المملكة | غرف صوتية سعودية" },
      {
        name: "description",
        content: "ادخل الغرف الصوتية، أرسل الهدايا، كوّن قروبك وتصدّر قائمة الدعم في ديوانية المملكة.",
      },
      { property: "og:title", content: "ديوانية المملكة | غرف صوتية سعودية" },
      { property: "og:description", content: "غرف صوتية مباشرة، هدايا، قروبات ومجتمع سعودي." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
  const top = useQuery({ queryKey: ["top"], queryFn: fetchTopSupporters });

  async function createRoom() {
    if (!user) return navigate({ to: "/auth" });
    if (!name.trim()) { toast.error("اكتب اسم الغرفة"); return; }
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: name.trim(), description: desc.trim(), owner_id: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setName("");
    setDesc("");
    qc.invalidateQueries({ queryKey: ["rooms"] });
    navigate({ to: "/room/$roomId", params: { roomId: data.id } });
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="gold-text text-lg font-black">ديوانية المملكة</h1>
          <p className="text-[10px] text-muted-foreground">غرف صوتية مباشرة</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/search" aria-label="بحث" className="rounded-full bg-secondary p-2">
            <Search className="h-4 w-4 text-primary" />
          </Link>
          <Link to="/leaderboard" aria-label="لوحة التكريم" className="rounded-full bg-secondary p-2">
            <Trophy className="h-4 w-4 text-primary" />
          </Link>
          {user ? (
            <button
              onClick={() => setCreating((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> غرفة جديدة
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
              دخول
            </Link>
          )}
        </div>
      </header>

      {creating && (
        <div className="mx-4 mt-3 space-y-2 rounded-2xl border border-border bg-card p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الغرفة"
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="وصف الغرفة"
            className="h-16 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button onClick={createRoom} className="w-full rounded-xl bg-primary py-2 text-sm font-black text-primary-foreground">
            إنشاء ودخول
          </button>
        </div>
      )}

      <section className="px-4 pt-4">
        <h2 className="mb-2 flex items-center gap-1 text-sm font-black">
          <Crown className="h-4 w-4 text-primary" /> أعلى الداعمين
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(top.data ?? []).slice(0, 10).map((p, i) => (
            <Link
              key={p.id}
              to="/profile/$userId"
              params={{ userId: p.id }}
              className="flex w-20 shrink-0 flex-col items-center gap-1"
            >
              <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-black ${i < 3 ? "gold-ring" : ""}`}>
                {p.avatar_url ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" /> : "👤"}
              </div>
              <span className="w-full truncate text-center text-[10px] font-bold">{p.username}</span>
              <span className="text-[9px] text-primary">{formatCoins(p.gifts_received)}</span>
            </Link>
          ))}
          {top.isLoading && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
        </div>
      </section>

      <section className="px-4 pt-3">
        <h2 className="mb-2 text-sm font-black">الغرف المباشرة</h2>
        <div className="grid grid-cols-2 gap-3">
          {(rooms.data ?? []).map((r) => (
            <Link
              key={r.id}
              to="/room/$roomId"
              params={{ roomId: r.id }}
              className="rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary"
            >
              <div className="mb-2 flex h-20 items-center justify-center rounded-xl bg-secondary text-3xl">
                {r.cover_url ? <img src={r.cover_url} alt={r.name} className="h-full w-full rounded-xl object-cover" /> : "🎙️"}
              </div>
              <p className="truncate text-xs font-black">{r.name}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                <Mic className="h-3 w-3 text-emerald-400" /> {r.description || "غرفة صوتية"}
              </p>
            </Link>
          ))}
        </div>
        {!rooms.isLoading && (rooms.data ?? []).length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">لا توجد غرف بعد — أنشئ أول غرفة!</p>
        )}
  </section>    
<UserLevels />

</AppShell>
  );  
 } 


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/BottomNav";
import BalootGame from "@/components/BalootGame";
import BasraGame from "@/components/BasraGame";
import CarromGame from "@/components/CarromGame";
import DominoGame from "@/components/DominoGame";
import LudoGame from "@/components/LudoGame";
import UnoGame from "@/components/UnoGame";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({
    meta: [
      { title: "صالة الألعاب | ديوانية المملكة" },
      { name: "description", content: "العب بلوت، لودو، كيرم، دومينو وأونو مع أهل الديوانية." },
      { property: "og:title", content: "صالة الألعاب | ديوانية المملكة" },
      { property: "og:description", content: "ألعاب جماعية داخل ديوانية المملكة." },
    ],
  }),
  component: GamesPage,
});

const games = [
  { id: "baloot", name: "بلوت سعودي", C: BalootGame },
  { id: "ludo", name: "لودو المملكة", C: LudoGame },
  { id: "carrom", name: "كيرم خشب", C: CarromGame },
  { id: "domino", name: "دومينو", C: DominoGame },
  { id: "basra", name: "بصرة", C: BasraGame },
  { id: "uno", name: "أونو", C: UnoGame },
] as const;

function LudoLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tables = useQuery({
    queryKey: ["game-tables"],
    queryFn: async () => {
      const { data } = await supabase.from("game_tables").select("id, players, status, host_id, created_at")
        .neq("status", "done").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 8000,
  });
  useEffect(() => {
    const ch = supabase.channel(`lobby-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, () => qc.invalidateQueries({ queryKey: ["game-tables"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  async function create() {
    if (!user) return;
    const { data, error } = await supabase.from("game_tables").insert({ host_id: user.id, players: [user.id] }).select("id").single();
    if (error || !data) return toast.error("تعذّر إنشاء الطاولة");
    navigate({ to: "/table/$tableId", params: { tableId: data.id } });
  }
  return (
    <div className="mx-4 my-3 rounded-2xl border border-primary/40 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="gold-text font-black">🎲 لودو جماعي مباشر</h3>
          <p className="text-[11px] text-muted-foreground">4 لاعبين • دردشة • صوت مباشر</p>
        </div>
        <button onClick={create} className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">+ طاولة جديدة</button>
      </div>
      <div className="space-y-2">
        {(tables.data ?? []).length === 0 && <p className="text-center text-xs text-muted-foreground">لا توجد طاولات، أنشئ أول طاولة!</p>}
        {(tables.data ?? []).map((t) => (
          <Link key={t.id} to="/table/$tableId" params={{ tableId: t.id }} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
            <span>طاولة لودو • {(t.players as string[]).length}/4 لاعبين</span>
            <span className="text-xs text-primary">{t.status === "playing" ? "مشاهدة" : "انضم"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GamesPage() {
  const [active, setActive] = useState<string>(games[0].id);
  const Current = games.find((g) => g.id === active)?.C ?? BalootGame;
  return (
    <AppShell title="صالة الألعاب">
      <LudoLobby />
      <p className="px-4 text-xs text-muted-foreground">ألعاب فردية ضد الكمبيوتر:</p>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${active === g.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="px-2">
        <Current />
      </div>
    </AppShell>
  );
}

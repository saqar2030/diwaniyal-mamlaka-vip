import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { formatCoins } from "@/lib/queries";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "لوحة التكريم | ديوانية المملكة" },
      { name: "description", content: "أفضل الغرف والقروبات والداعمين والكبلات في ديوانية المملكة." },
      { property: "og:title", content: "لوحة التكريم في ديوانية المملكة" },
      { property: "og:description", content: "المراكز الثلاثة الأولى للغرف والقروبات والداعمين والكبلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const medals = ["🥇", "🥈", "🥉"];

function Podium({ title, items }: { title: string; items: { key: string; label: string; value: string; to?: string; params?: any }[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <h2 className="mb-2 flex items-center gap-1 text-sm font-black">
        <Crown className="h-4 w-4 text-primary" /> {title}
      </h2>
      <div className="space-y-2">
        {items.slice(0, 3).map((it, i) => {
          const inner = (
            <>
              <span className="text-lg">{medals[i]}</span>
              <span className="flex-1 truncate text-xs font-bold">{it.label}</span>
              <span className="text-[11px] font-black text-primary">{it.value}</span>
            </>
          );
          return it.to ? (
            <Link key={it.key} to={it.to} params={it.params} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
              {inner}
            </Link>
          ) : (
            <div key={it.key} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">{inner}</div>
          );
        })}
        {items.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">لا توجد بيانات بعد.</p>}
      </div>
    </section>
  );
}

function LeaderboardPage() {
  const supporters = useQuery({
    queryKey: ["lb-supporters"],
    queryFn: async () => {
                        const { data } = await supabase
          .from("profiles")
          .select("id, username, gifts_received")
          .order("gifts_received", { ascending: false })
          .limit(10);
        
        const safeData = (data ?? []).map(user => ({
          ...user,
          gifts_received: user.gifts_received ?? 0,
          level: (user as any).level ?? 1,
          xp: (user as any).xp ?? 0
        }));
        
        return safeData;
},
  });

  const rooms = useQuery({
    queryKey: ["lb-rooms"],
    queryFn: async () => {
      const { data } = await supabase.from("gift_events").select("room_id, amount").not("room_id", "is", null).limit(2000);
      const totals = new Map<string, number>();
      (data ?? []).forEach((g: any) => totals.set(g.room_id, (totals.get(g.room_id) ?? 0) + Number(g.amount)));
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length === 0) return [];
      const { data: rs } = await supabase.from("rooms").select("id, name").in("id", top.map((t) => t[0]));
      return top.map(([id, amount]) => ({ id, amount, name: (rs ?? []).find((r) => r.id === id)?.name ?? "غرفة" }));
    },
  });

  const families = useQuery({
    queryKey: ["lb-families"],
    queryFn: async () => {
      const { data } = await supabase.from("families").select("id, name, family_members(user_id)").limit(200);
      return (data ?? [])
        .map((f: any) => ({ id: f.id, name: f.name, members: (f.family_members ?? []).length }))
        .sort((a, b) => b.members - a.members)
        .slice(0, 3);
    },
  });

  const couples = useQuery({
    queryKey: ["lb-couples"],
    queryFn: async () => {
      const { data } = await supabase.from("couples").select("*").order("points", { ascending: false }).limit(3);
      const ids = Array.from(new Set((data ?? []).flatMap((c: any) => [c.user_a, c.user_b])));
      if (ids.length === 0) return [];
      const { data: ps } = await supabase.from("profiles").select("id, username").in("id", ids);
      const nameOf = (id: string) => (ps ?? []).find((p) => p.id === id)?.username ?? "عضو";
      return (data ?? []).map((c: any) => ({ id: c.id, label: `${nameOf(c.user_a)} ❤ ${nameOf(c.user_b)}`, points: Number(c.points) }));
    },
  });

  return (
    <AppShell title="لوحة التكريم">
      <div className="space-y-3 px-4 py-4">
        <Podium
          title="أفضل الداعمين"
          items={(supporters.data ?? []).map((p) => ({
            key: p.id, label: p.username, value: formatCoins(Number(p.gifts_received)),
            to: "/profile/$userId", params: { userId: p.id },
          }))}
        />
        <Podium
          title="أفضل الرومات"
          items={(rooms.data ?? []).map((r) => ({ key: r.id, label: r.name, value: formatCoins(r.amount) }))}
        />
        <Podium
          title="أفضل القروبات"
          items={(families.data ?? []).map((f) => ({ key: f.id, label: f.name, value: `${f.members} عضو` }))}
        />
        <Podium
          title="أفضل كبل"
          items={(couples.data ?? []).map((c) => ({ key: c.id, label: c.label, value: formatCoins(c.points) }))}
        />
      </div>
    </AppShell>
  );
}

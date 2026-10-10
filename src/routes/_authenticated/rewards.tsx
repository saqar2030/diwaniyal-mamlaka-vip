import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Check, Flame } from "lucide-react";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DailyCheckInModal, useCheckin } from "@/components/DailyCheckIn";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "المهام والجوائز اليومية | ديوانية المملكة" }, { name: "description", content: "سجّل يومياً وأكمل المهام لتربح العملات الذهبية." }] }),
  component: RewardsPage,
});

const CHESTS = [
  { need: 20, reward: 10, emoji: "🟩" }, { need: 40, reward: 25, emoji: "🟫" },
  { need: 70, reward: 50, emoji: "🟪" }, { need: 100, reward: 100, emoji: "🟦" },
];

type Act = { room_messages: number; direct_messages: number; posts: number; comments: number; gifts: number; checkin: number; points: number };

function RewardsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCheckin, setShowCheckin] = useState(false);
  const checkin = useCheckin();

  const act = useQuery({
    queryKey: ["daily-activity", user?.id], enabled: !!user, refetchInterval: 15000,
    queryFn: async () => (await supabase.rpc("my_daily_activity")).data as unknown as Act,
  });
  const claims = useQuery({
    queryKey: ["chest-claims", user?.id], enabled: !!user,
    queryFn: async () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
      const { data } = await supabase.from("activity_claims").select("tier").eq("day", today);
      return new Set((data ?? []).map((x) => x.tier));
    },
  });

  const a = act.data;
  const pts = a?.points ?? 0;

  async function openChest(tier: number) {
    const { data, error } = await supabase.rpc("claim_activity_chest", { _tier: tier });
    if (error) { toast.error(error.message); return; }
    toast.success(`🎁 +${data} عملة ذهبية`);
    qc.invalidateQueries({ queryKey: ["chest-claims"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  const tasks = [
    { title: "سجّل دخولك اليومي", have: a?.checkin ?? 0, need: 1, pts: 10, action: () => setShowCheckin(true) },
    { title: "أرسل 10 رسائل في الغرف الصوتية", have: a?.room_messages ?? 0, need: 10, pts: 20, to: "/" },
    { title: "أرسل 5 رسائل خاصة", have: a?.direct_messages ?? 0, need: 5, pts: 10, to: "/messages" },
    { title: "انشر منشوراً في المجتمع", have: a?.posts ?? 0, need: 1, pts: 20, to: "/feed" },
    { title: "علّق على 3 منشورات", have: a?.comments ?? 0, need: 3, pts: 15, to: "/feed" },
    { title: "أرسل هدية في غرفة", have: a?.gifts ?? 0, need: 1, pts: 25, to: "/" },
  ] as const;

  return (
    <AppShell title="المهام اليومية">
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">النشاط اليومي</p>
            <p className="flex items-center gap-1 text-4xl font-black"><Flame className="h-7 w-7 text-primary" />{pts}</p>
          </div>
          <button onClick={() => setShowCheckin(true)} className="vip-card rounded-2xl px-4 py-2 text-xs font-black">
            📅 تسجيل الدخول {checkin.data?.doneToday ? "✓" : "•"}
          </button>
        </div>

        <div className="vip-card rounded-3xl p-4">
          <p className="mb-1 text-sm font-black">أكمل المهام لكسب العملات الذهبية</p>
          <p className="mb-4 text-[10px] text-muted-foreground">تتجدد كل يوم الساعة 12 منتصف الليل بتوقيت الرياض</p>
          <div className="grid grid-cols-4 gap-2">
            {CHESTS.map((c, i) => {
              const tier = i + 1;
              const got = claims.data?.has(tier);
              const ready = pts >= c.need && !got;
              return (
                <button key={tier} disabled={!ready} onClick={() => openChest(tier)}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 ${ready ? "bg-primary/20 animate-pulse" : "bg-secondary"}`}>
                  <span className="text-3xl">{got ? "📭" : "🧰"}</span>
                  <span className="text-[10px] font-black text-primary">+{c.reward}🪙</span>
                  <span className="text-[10px]">🔥{c.need}</span>
                  {got ? <Check className="h-4 w-4 text-primary" /> : ready ? <span className="text-[9px] font-black">افتح</span> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(pts, 100)}%` }} />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-black">المهام اليومية</p>
          <div className="space-y-3">
            {tasks.map((t) => {
              const done = t.have >= t.need;
              return (
                <div key={t.title} className="flex items-center justify-between gap-2 border-b border-border/50 pb-3 last:border-0">
                  <div>
                    <p className="text-xs font-bold">{t.title} <span className="text-muted-foreground">({Math.min(t.have, t.need)}/{t.need})</span></p>
                    <p className="text-[10px] text-primary">🔥 x{t.pts}</p>
                  </div>
                  {done ? (
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-[11px] font-black text-primary">مكتملة ✓</span>
                  ) : "to" in t ? (
                    <Link to={t.to} className="rounded-full border border-primary px-3 py-1 text-[11px] font-black text-primary">اذهب إلى</Link>
                  ) : (
                    <button onClick={t.action} className="rounded-full border border-primary px-3 py-1 text-[11px] font-black text-primary">اذهب إلى</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showCheckin && <DailyCheckInModal onClose={() => { setShowCheckin(false); act.refetch(); }} />}
    </AppShell>
  );
}

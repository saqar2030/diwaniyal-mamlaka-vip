import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const CHECKIN_REWARDS = [5, 5, 5, 5, 10, 10, 100];

function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}
function riyadhYesterday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(Date.now() - 864e5));
}

export function useCheckin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["checkin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("daily_checkins").select("day, streak").eq("user_id", user!.id).order("day", { ascending: false }).limit(1);
      const last = data?.[0];
      const today = riyadhToday();
      const doneToday = last?.day === today;
      const continuing = last && (doneToday || last.day === riyadhYesterday()) ;
      const streak = continuing ? last!.streak : 0;
      // الأيام المكتملة في الدورة الحالية
      const shown = doneToday ? streak : streak >= 7 ? 0 : streak;
      return { doneToday, shown };
    },
  });
}

export function DailyCheckInModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const c = useCheckin();
  const done = c.data?.shown ?? 0;
  const doneToday = c.data?.doneToday ?? false;

  async function claim() {
    const { data, error } = await supabase.rpc("claim_daily_checkin");
    if (error) { toast.error(error.message); return; }
    const r = data as { reward: number; streak: number };
    toast.success(r.streak === 7 ? `🎁 صندوق الهدية الملكي! +${r.reward} عملة` : `+${r.reward} عملة 🪙`);
    qc.invalidateQueries({ queryKey: ["checkin"] });
    qc.invalidateQueries({ queryKey: ["daily-activity"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="vip-card w-full max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="gold-text mb-1 text-center text-xl font-black">📅 التسجيل اليومي</h2>
        <p className="mb-4 text-center text-[11px] text-muted-foreground">سجّل ٧ أيام متتالية واحصل على صندوق الهدية الملكي</p>
        <div className="grid grid-cols-4 gap-2">
          {CHECKIN_REWARDS.map((r, i) => {
            const got = i < done;
            const next = !doneToday && i === done;
            return (
              <div key={i} className={`relative flex flex-col items-center rounded-2xl border p-2 ${i === 6 ? "col-span-2" : ""} ${
                got ? "border-primary bg-primary/15" : next ? "border-primary bg-secondary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "border-border bg-secondary/60"}`}>
                <span className="text-[10px] text-muted-foreground">اليوم {i + 1}</span>
                <span className="text-2xl">{i === 6 ? "🎁" : "🪙"}</span>
                <span className="text-[10px] font-black text-primary">{i === 6 ? `صندوق +${r}` : `x${r}`}</span>
                {got && <span className="absolute -top-1 -left-1 rounded-full bg-primary p-0.5 text-primary-foreground"><Check className="h-3 w-3" /></span>}
              </div>
            );
          })}
        </div>
        <button disabled={doneToday} onClick={claim}
          className="mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50">
          {doneToday ? "تم الاستلام اليوم ✓ — ارجع بكرة" : "استلم مكافأة اليوم"}
        </button>
      </div>
      <button onClick={onClose} aria-label="إغلاق" className="mt-4 rounded-full border border-border p-2"><X className="h-5 w-5" /></button>
    </div>
  );
}

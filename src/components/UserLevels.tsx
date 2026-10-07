import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Zap, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** بطاقة المستوى الحقيقية — تتحدث تلقائيًا من السيرفر مع كل تفاعل */
export default function UserLevels() {
  const { user } = useAuth();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const prevLevel = useRef<number | null>(null);

  const stats = useQuery({
    queryKey: ["my-level", user?.id],
    enabled: !!user,
    refetchInterval: 8000,
    queryFn: async () => {
      const [lv, rm, dm, fm] = await Promise.all([
        supabase.from("user_levels").select("xp_points, current_level").eq("user_id", user!.id).maybeSingle(),
        supabase.from("room_messages").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("direct_messages").select("id", { count: "exact", head: true }).eq("sender_id", user!.id),
        supabase.from("family_messages").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return {
        xp: lv.data?.xp_points ?? 0,
        level: lv.data?.current_level ?? 1,
        messages: (rm.count ?? 0) + (dm.count ?? 0) + (fm.count ?? 0),
      };
    },
  });

  const level = stats.data?.level ?? 1;
  useEffect(() => {
    if (!stats.data) return;
    if (prevLevel.current !== null && level > prevLevel.current) {
      setLevelUp(level);
      const t = setTimeout(() => setLevelUp(null), 4000);
      prevLevel.current = level;
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
  }, [level, stats.data]);

  if (!user) return null;

  const xp = stats.data?.xp ?? 0;
  const needed = level * 100;
  const pct = Math.min((xp / needed) * 100, 100);
  const msgs = stats.data?.messages ?? 0;
  const power = msgs >= 200 ? "أسطوري" : msgs >= 50 ? "نشط جداً" : msgs >= 10 ? "نشط" : "مبتدئ";

  return (
    <div className="relative mx-4 my-3 rounded-2xl border border-border bg-card p-4">
      {levelUp && (
        <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-primary-foreground">
          <ChevronUp className="h-3.5 w-3.5" /> مبروك! صعدت للمستوى {levelUp} 🔥
        </div>
      )}
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-full bg-primary p-2 text-primary-foreground"><Award className="h-5 w-5" /></div>
        <div>
          <h4 className="gold-text text-sm font-black">رتبة العضوية والمستويات</h4>
          <p className="text-[10px] text-muted-foreground">تصعد تلقائيًا مع كل رسالة ومنشور وتعليق وهدية</p>
        </div>
      </div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span>المستوى: <b className="text-base text-primary">{level}</b></span>
        <span className="text-muted-foreground">{xp} / {needed} XP</span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between rounded-xl bg-secondary px-3 py-2 text-[11px]">
        <span>💬 رسائلك: <b>{msgs}</b></span>
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> قوة التفاعل: <b>{power}</b></span>
      </div>
    </div>
  );
}

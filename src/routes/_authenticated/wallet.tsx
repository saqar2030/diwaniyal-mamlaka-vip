import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, formatCoins } from "@/lib/queries";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => fetchProfile(user!.id),
  });

  const packages = useQuery({
    queryKey: ["coin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coin_packages").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const history = useQuery({
    queryKey: ["coin-tx", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("coin_transactions").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  async function buy(id: string) {
    const { error } = await supabase.rpc("topup_coins", { _package_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم شحن رصيدك 🎉");
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    history.refetch();
  }

  return (
    <AppShell title="شحن العملات">
      <div className="space-y-3 px-4 py-4">
        <div className="rounded-3xl border border-border bg-card p-4 text-center">
          <p className="text-[11px] text-muted-foreground">رصيدك الحالي</p>
          <p className="gold-text text-2xl font-black">{formatCoins(profile.data?.coins ?? 0)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(packages.data ?? []).map((p: any) => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              className="rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary"
            >
              <Coins className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-1 text-xs font-black">{p.name}</p>
              <p className="text-sm font-black text-primary">{formatCoins(Number(p.coins))}</p>
              <p className="text-[10px] text-muted-foreground">{Number(p.price_sar).toFixed(2)} ر.س</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-black">آخر العمليات</p>
          {(history.data ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border/50 py-1.5 text-[11px] last:border-0">
              <span className="text-muted-foreground">{t.note || t.kind}</span>
              <span className="font-black text-primary">+{formatCoins(Number(t.amount))}</span>
            </div>
          ))}
          {(history.data ?? []).length === 0 && (
            <p className="py-4 text-center text-[11px] text-muted-foreground">لا توجد عمليات بعد.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCoins } from "@/lib/queries";
import { FramedAvatar, ENTRIES, VipBadge } from "@/components/Vip";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({ meta: [{ title: "متجر VIP الملكي | ديوانية المملكة" }, { name: "description", content: "عضويات VIP وإطارات ودخوليات مميزة للغرف." }] }),
  component: StorePage,
});

const PERKS = [
  ["🏅", "علامة VIP", 1], ["👑", "تاج بجانب الاسم", 1], ["🖼️", "إطار حصري", 2],
  ["🐎", "دخول مميز للروم", 3], ["💬", "فقاعة دردشة ذهبية", 4], ["🎧", "دعم حصري", 5],
] as const;

function StorePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"vip" | "frame" | "entry">("vip");

  const me = useQuery({
    queryKey: ["vip-me", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("coins, avatar_url, username, vip_level, active_frame, active_entry").eq("id", user!.id).single()).data,
  });
  const items = useQuery({ queryKey: ["store-items"], queryFn: async () => (await supabase.from("store_items").select("*").order("sort_order")).data ?? [] });
  const owned = useQuery({
    queryKey: ["my-items", user?.id], enabled: !!user,
    queryFn: async () => new Set(((await supabase.from("user_items").select("item_id")).data ?? []).map((x) => x.item_id)),
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["vip-me"] }); qc.invalidateQueries({ queryKey: ["my-items"] }); qc.invalidateQueries({ queryKey: ["profile"] }); };

  async function buy(id: string) {
    const { error } = await supabase.rpc("buy_store_item", { _item: id });
    if (error) return toast.error(error.message);
    toast.success("تم الشراء والتفعيل 👑"); refresh();
  }
  async function equip(kind: string, code: string | null) {
    const { error } = await supabase.rpc("equip_store_item", { _kind: kind, _code: code as string });
    if (error) return toast.error(error.message);
    toast.success(code ? "تم التفعيل" : "تم الإلغاء"); refresh();
  }

  const lvl = me.data?.vip_level ?? 0;
  const list = (items.data ?? []).filter((i) => i.kind === tab);

  return (
    <AppShell title="متجر VIP الملكي">
      <div className="space-y-4 px-4 py-4">
        <div className="vip-card rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <FramedAvatar src={me.data?.avatar_url} frame={me.data?.active_frame} size={64} />
            <div className="flex-1">
              <p className="text-sm font-black">{me.data?.username}<VipBadge level={lvl} /></p>
              <p className="gold-text text-3xl font-black italic">{lvl ? `VIP${lvl}` : "VIP"}</p>
              <p className="text-[10px] text-muted-foreground">{lvl ? "عضويتك مفعّلة" : "لم يتم الحصول عليه"}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${(lvl / 5) * 100}%` }} /></div>
        </div>

        <div className="flex gap-2">
          {([["vip", "عضوية VIP"], ["frame", "إطار الرأس"], ["entry", "دخول مميز"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-xs font-black ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{l}</button>
          ))}
        </div>

        {tab === "vip" && (
          <div className="grid grid-cols-3 gap-2">
            {PERKS.map(([e, t, v]) => (
              <div key={t} className={`vip-card rounded-2xl p-2 text-center ${lvl >= v ? "" : "opacity-60"}`}>
                <div className="text-2xl">{e}</div>
                <p className="text-[10px] font-black">{t}</p>
                <p className="text-[9px] text-muted-foreground">فتح بعد VIP{v}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {list.map((it) => {
            const has = owned.data?.has(it.id);
            const active = (it.kind === "frame" && me.data?.active_frame === it.code) || (it.kind === "entry" && me.data?.active_entry === it.code) || (it.kind === "vip" && lvl === it.vip_level);
            return (
              <div key={it.id} className="vip-card flex flex-col items-center gap-2 rounded-2xl p-3">
                <div className="flex h-24 items-center justify-center pt-4">
                  {it.kind === "frame" && <FramedAvatar src={me.data?.avatar_url} frame={it.code} size={64} />}
                  {it.kind === "entry" && <span className="text-5xl">{ENTRIES[it.code]?.emoji}</span>}
                  {it.kind === "vip" && <span className="gold-text text-3xl font-black italic">VIP{it.vip_level}</span>}
                </div>
                <p className="text-xs font-black">{it.name}</p>
                {has ? (
                  it.kind === "vip" ? <span className="text-[11px] font-black text-primary">✓ مملوكة</span> :
                  <button onClick={() => equip(it.kind, active ? null : it.code)} className={`w-full rounded-full py-1.5 text-[11px] font-black ${active ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>{active ? "مفعّل ✓ (إلغاء)" : "تفعيل"}</button>
                ) : (
                  <button onClick={() => buy(it.id)} className="w-full rounded-full bg-primary py-1.5 text-[11px] font-black text-primary-foreground">🪙 {formatCoins(Number(it.price))}</button>
                )}
              </div>
            );
          })}
        </div>

        <div className="vip-card flex items-center justify-between rounded-2xl p-3 text-xs">
          <span>الرصيد: <b className="text-primary">{formatCoins(Number(me.data?.coins ?? 0))}</b></span>
          <Link to="/wallet" className="rounded-full bg-primary px-4 py-1.5 font-black text-primary-foreground">اشحن الآن</Link>
        </div>
      </div>
    </AppShell>
  );
}

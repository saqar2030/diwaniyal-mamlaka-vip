import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCoins } from "@/lib/queries";
import { Lock, Trash2, EyeOff, Eye, Ban, Coins, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<"rooms" | "families" | "posts" | "users" | "coins" | "settings">("rooms");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  async function unlock() {
    const { error } = await supabase.rpc("claim_super_admin", { _pin: pin });
    if (error) { toast.error(error.message); return; }
    setUnlocked(true);
    setPin("");
    toast.success("مرحباً بك في لوحة التحكم العليا");
  }

  const rooms = useQuery({
    queryKey: ["admin-rooms"], enabled: unlocked,
    queryFn: async () => (await supabase.from("rooms").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const families = useQuery({
    queryKey: ["admin-families"], enabled: unlocked,
    queryFn: async () => (await supabase.from("families").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const posts = useQuery({
    queryKey: ["admin-posts"], enabled: unlocked,
    queryFn: async () => (await supabase.from("posts").select("*, profiles:user_id(username)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const users = useQuery({
    queryKey: ["admin-users"], enabled: unlocked,
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const gifts = useQuery({
    queryKey: ["admin-gifts"], enabled: unlocked,
    queryFn: async () => (await supabase.from("gifts").select("*").order("sort_order")).data ?? [],
  });
  const packages = useQuery({
    queryKey: ["admin-packages"], enabled: unlocked,
    queryFn: async () => (await supabase.from("coin_packages").select("*").order("sort_order")).data ?? [],
  });

  async function del(table: "rooms" | "families" | "posts", id: string, key: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: [key] });
    toast.success("تم الحذف");
  }

  async function toggleHide(id: string, hidden: boolean) {
    await supabase.from("posts").update({ is_hidden: !hidden }).eq("id", id);
    posts.refetch();
  }

  async function toggleBan(id: string, banned: boolean) {
    const { error } = await supabase.from("profiles").update({ is_banned: !banned }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    users.refetch();
  }

  async function setCoins(id: string, value: string) {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    await supabase.from("profiles").update({ coins: n }).eq("id", id);
    users.refetch();
  }

  async function setGiftPrice(id: string, value: string) {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    await supabase.from("gifts").update({ price: n }).eq("id", id);
    gifts.refetch();
  }

  async function setPackage(
    id: string,
    patch: { coins?: number; price_sar?: number; is_active?: boolean },
  ) {
    await supabase.from("coin_packages").update(patch).eq("id", id);
    packages.refetch();
  }

  async function changePin() {
    const { error } = await supabase.rpc("set_super_pin", { _old: oldPin, _new: newPin });
    if (error) { toast.error(error.message); return; }
    setOldPin(""); setNewPin("");
    toast.success("تم تغيير الرقم السري");
  }

  if (!unlocked) {
    return (
      <AppShell title="لوحة التحكم">
        <div className="mx-4 mt-16 space-y-3 rounded-3xl border border-border bg-card p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <p className="text-xs font-black">أدخل الرقم السري للوحة الإدارة العليا</p>
          <input
            type="password" value={pin} onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-center text-sm outline-none focus:border-primary"
          />
          <button onClick={unlock} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
            دخول
          </button>
        </div>
      </AppShell>
    );
  }

  const tabs = [
    ["rooms", "الغرف"], ["families", "القروبات"], ["posts", "المنشورات"],
    ["users", "الأعضاء"], ["coins", "العملات"], ["settings", "الإعدادات"],
  ] as const;

  return (
    <AppShell title="لوحة التحكم العليا">
      <div className="space-y-3 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "rooms" && (rooms.data ?? []).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
            <span className="font-black">{r.name}</span>
            <button onClick={() => del("rooms", r.id, "admin-rooms")} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}

        {tab === "families" && (families.data ?? []).map((f: any) => (
          <div key={f.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
            <span className="font-black">{f.name}</span>
            <button onClick={() => del("families", f.id, "admin-families")} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}

        {tab === "posts" && (posts.data ?? []).map((p: any) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-3 text-xs">
            <p className="font-black text-primary">{p.profiles?.username}</p>
            <p className="mt-1 text-muted-foreground">{p.content}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => toggleHide(p.id, p.is_hidden)} className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-black">
                {p.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {p.is_hidden ? "إظهار" : "حجب"}
              </button>
              <button onClick={() => del("posts", p.id, "admin-posts")} className="flex items-center gap-1 rounded-lg bg-destructive px-2 py-1 text-[11px] font-black text-destructive-foreground">
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            </div>
          </div>
        ))}

        {tab === "users" && (users.data ?? []).map((u: any) => (
          <div key={u.id} className="rounded-2xl border border-border bg-card p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black">{u.username} <span className="text-[10px] text-muted-foreground">#{u.display_id}</span></span>
              <button onClick={() => toggleBan(u.id, u.is_banned)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black ${u.is_banned ? "bg-secondary" : "bg-destructive text-destructive-foreground"}`}>
                <Ban className="h-3.5 w-3.5" /> {u.is_banned ? "فك الحظر" : "حظر"}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground">الرصيد</span>
              <input defaultValue={u.coins} onBlur={(e) => setCoins(u.id, e.target.value)}
                className="w-24 rounded-lg border border-border bg-input px-2 py-1 text-[11px] outline-none focus:border-primary" />
              <span className="text-primary">{formatCoins(Number(u.gifts_received))} دعم</span>
            </div>
          </div>
        ))}

        {tab === "coins" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-black"><Coins className="h-4 w-4 text-primary" /> أسعار الهدايا</p>
              {(gifts.data ?? []).map((g: any) => (
                <div key={g.id} className="flex items-center justify-between py-1 text-[11px]">
                  <span>{g.emoji} {g.name}</span>
                  <input defaultValue={g.price} onBlur={(e) => setGiftPrice(g.id, e.target.value)}
                    className="w-24 rounded-lg border border-border bg-input px-2 py-1 outline-none focus:border-primary" />
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-black">باقات الشحن</p>
              {(packages.data ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 py-1 text-[11px]">
                  <span className="flex-1 truncate">{p.name}</span>
                  <input defaultValue={p.coins} onBlur={(e) => setPackage(p.id, "coins", Number(e.target.value))}
                    className="w-20 rounded-lg border border-border bg-input px-2 py-1 outline-none focus:border-primary" />
                  <input defaultValue={p.price_sar} onBlur={(e) => setPackage(p.id, "price_sar", Number(e.target.value))}
                    className="w-16 rounded-lg border border-border bg-input px-2 py-1 outline-none focus:border-primary" />
                  <input type="checkbox" checked={p.is_active} onChange={(e) => setPackage(p.id, "is_active", e.target.checked)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1 text-xs font-black"><KeyRound className="h-4 w-4 text-primary" /> تغيير الرقم السري</p>
            <input type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} placeholder="الرقم الحالي"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
            <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="الرقم الجديد"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
            <button onClick={changePin} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">حفظ</button>
            <p className="text-[10px] text-muted-foreground">الحساب الحالي: {user?.email}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

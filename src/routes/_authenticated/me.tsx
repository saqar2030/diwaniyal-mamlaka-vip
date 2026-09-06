import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, formatCoins } from "@/lib/queries";
import { Coins, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me")({
  component: MePage,
});

function MePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => fetchProfile(user!.id),
  });

  useEffect(() => {
    if (profile.data) {
      setUsername(profile.data.username);
      setBio(profile.data.bio ?? "");
      setAvatar(profile.data.avatar_url ?? "");
    }
  }, [profile.data]);

  async function save() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ username, bio, avatar_url: avatar || null })
      .eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ ملفك");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const p = profile.data;

  return (
    <AppShell title="حسابي">
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-3xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl gold-ring">
            {avatar ? <img src={avatar} alt={username} className="h-full w-full object-cover" /> : "👤"}
          </div>
          <h2 className="text-base font-black text-primary">{p?.username}</h2>
          <p className="text-[10px] text-muted-foreground">ID: {p?.display_id}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">الرصيد</p>
              <p className="font-black text-primary">{formatCoins(p?.coins ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">الدعم المستلم</p>
              <p className="font-black text-emerald-400">{formatCoins(p?.gifts_received ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">الدعم المرسل</p>
              <p className="font-black text-accent">{formatCoins(p?.gifts_sent ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1 text-xs font-black">
            <Coins className="h-4 w-4 text-primary" /> تعديل ملفي
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="الاسم المستعار"
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="رابط صورتك الشخصية"
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="نبذة عنك"
            className="h-16 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <button onClick={save} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
            حفظ التعديلات
          </button>
        </div>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold text-destructive"
        >
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </button>
      </div>
    </AppShell>
  );
}

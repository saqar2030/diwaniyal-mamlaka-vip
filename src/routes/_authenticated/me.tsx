import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchTopSupportersOf, formatCoins } from "@/lib/queries";
import { uploadMedia, extOf } from "@/lib/upload";
import { Coins, LogOut, Camera, Trophy, Search, Shield, Star } from "lucide-react";

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
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // حالات حفظ اللفل والنقاط القادمة من السيرفر
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userXP, setUserXP] = useState<number>(0);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => fetchProfile(user!.id),
  });

  const supporters = useQuery({
    queryKey: ["top-supporters-of", user?.id],
    enabled: !!user,
    queryFn: () => fetchTopSupportersOf(user!.id),
  });

  // جلب اللفل والنقاط الحية من جدول user_levels في Supabase تلقائياً
  useEffect(() => {
    async function getLevels() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("user_levels")
          .select("xp_points, current_level")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setUserLevel(data.current_level ? Number(data.current_level) : 1);
          setUserXP(data.xp_points ? Number(data.xp_points) : 0);
        }
      } catch (err) {
        console.error("خطأ في جلب بيانات اللفل", err);
      }
    }

    getLevels();
  }, [user?.id]);

  useEffect(() => {
    if (profile.data) {
      setUsername(profile.data.username);
      setBio(profile.data.bio ?? "");
      setAvatar(profile.data.avatar_url ?? "");
    }
  }, [profile.data]);

  // دالة لتحديد لقب العضو بناءً على مستواه الحالي
  function getMemberTitle(lvl: number) {
    if (lvl >= 10) return "شيخ الديوانية 👑";
    if (lvl >= 7) return "مستشار الديوانية ⚜️";
    if (lvl >= 5) return "راعي الفزعة 🔥";
    if (lvl >= 3) return "قهوجي الديوانية ☕";
    return "عضو جديد 🌴";
  }

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setBusy(true);
    try {
      const url = await uploadMedia(user.id, file, extOf(file));
      setAvatar(url);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("تم تحديث صورتك");
    } catch {
      toast.error("تعذّر رفع الصورة");
    } finally {
      setBusy(false);
    }
  }

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
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <AppShell title="حسابي">
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-3xl border border-border bg-card p-4 text-center">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="relative mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl gold-ring"
          >
            {avatar ? <img src={avatar} alt={username} className="h-full w-full object-cover" /> : "👤"}
            <span className="absolute bottom-0 w-full bg-black/50 py-0.5"><Camera className="mx-auto h-3.5 w-3.5" /></span>
          </button>
          
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-base font-black text-primary">{p?.username}</h2>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-500 border border-amber-500/20">
              {getMemberTitle(userLevel)}
            </span>
          </div>
          
          <p className="text-[10px] text-muted-foreground">ID: {p?.display_id}</p>

          {/* نظام الـ Progress Bar الذهبي المطور للفل والألعاب */}
          <div className="mx-auto mt-3 max-w-[280px] rounded-xl border border-border/60 bg-secondary/50 p-2.5 text-right">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
              <span className="flex items-center gap-0.5 text-primary"><Star className="h-3 w-3 fill-primary text-primary" /> المستوى {userLevel}</span>
              <span>{userXP} / 100 XP</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-input border border-border/40">
              <div 
                className="h-full bg-gradient-to-l from-amber-500 to-yellow-400 transition-all duration-500" 
                style={{ width: `${userXP}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
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

        <div className="grid grid-cols-2 gap-2 text-[11px] font-black">
          <Link to="/wallet" className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-primary-foreground">
            <Coins className="h-4 w-4" /> شحن العملات
          </Link>
          <Link to="/leaderboard" className="flex items-center justify-center gap-1 rounded-xl bg-secondary py-2">
            <Trophy className="h-4 w-4 text-primary" /> لوحة التكريم
          </Link>
          <Link to="/search" className="flex items-center justify-center gap-1 rounded-xl bg-secondary py-2">
            <Search className="h-4 w-4 text-primary" /> بحث بالآيدي
          </Link>
          <Link to="/admin" className="flex items-center justify-center gap-1 rounded-xl bg-secondary py-2">
            <Shield className="h-4 w-4 text-primary" /> لوحة التحكم
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-black">أفضل داعميني</p>
          {(supporters.data ?? []).map((s, i) => (
            <Link
              key={s.id}
              to="/profile/$userId"
              params={{ userId: s.id }}
              className="flex items-center gap-2 border-b border-border/50 py-1.5 text-[11px] last:border-0"
            >
              <span>{medals[i]}</span>
              <span className="flex-1 truncate font-bold">{s.username}</span>
              <span className="font-black text-primary">{formatCoins(s.amount)}</span>
            </Link>
          ))}
          {(supporters.data ?? []).length === 0 && (
            <p className="py-3 text-center text-[11px] text-muted-foreground">لا يوجد داعمون بعد.</p>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-black">تعديل ملفي</p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="الاسم المستعار"
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

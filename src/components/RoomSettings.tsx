import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, extOf } from "@/lib/upload";
import { X, Upload, Shield, Ban, Trash2 } from "lucide-react";

export type RoomRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  cover_url: string | null;
  background_url: string | null;
  banner_url: string | null;
  banner_animated: boolean;
  welcome_message: string | null;
  is_locked: boolean;
  room_pin: string | null;
};

export function RoomSettings({ room, userId, onClose }: { room: RoomRow; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(room.name);
  const [desc, setDesc] = useState(room.description ?? "");
  const [welcome, setWelcome] = useState(room.welcome_message ?? "");
  const [locked, setLocked] = useState(room.is_locked);
  const [pin, setPin] = useState(room.room_pin ?? "");
  const [animated, setAnimated] = useState(room.banner_animated);
  const [banner, setBanner] = useState(room.banner_url ?? "");
  const [background, setBackground] = useState(room.background_url ?? "");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const bgRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const roles = useQuery({
    queryKey: ["room-roles", room.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_roles")
        .select("*, profiles:user_id(username, display_id, avatar_url)")
        .eq("room_id", room.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const bans = useQuery({
    queryKey: ["room-bans", room.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_bans")
        .select("*, profiles:user_id(username, display_id)")
        .eq("room_id", room.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>, set: (v: string) => void) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      set(await uploadMedia(userId, file, extOf(file)));
      toast.success("تم الرفع");
    } catch {
      toast.error("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const { error } = await supabase
      .from("rooms")
      .update({
        name: name.trim() || room.name,
        description: desc,
        welcome_message: welcome,
        is_locked: locked,
        room_pin: locked ? pin || null : null,
        banner_url: banner || null,
        banner_animated: animated,
        background_url: background || null,
        cover_url: banner || room.cover_url,
      })
      .eq("id", room.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ إعدادات الغرفة");
    qc.invalidateQueries({ queryKey: ["room", room.id] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }

  async function findUser(displayId: string) {
    const { data } = await supabase.from("profiles").select("id, username").eq("display_id", displayId.trim()).maybeSingle();
    return data;
  }

  async function grant(role: "admin" | "moderator") {
    const target = await findUser(targetId);
    if (!target) { toast.error("لا يوجد عضو بهذا الآيدي"); return; }
    const { error } = await supabase.from("room_roles").insert({ room_id: room.id, user_id: target.id, role });
    if (error) { toast.error(error.message); return; }
    setTargetId("");
    toast.success(`تم تعيين ${target.username}`);
    roles.refetch();
  }

  async function revoke(id: string) {
    await supabase.from("room_roles").delete().eq("id", id);
    roles.refetch();
  }

  async function banUser() {
    const target = await findUser(targetId);
    if (!target) { toast.error("لا يوجد عضو بهذا الآيدي"); return; }
    await supabase.from("room_seats").update({ user_id: null }).eq("room_id", room.id).eq("user_id", target.id);
    const { error } = await supabase.from("room_bans").insert({ room_id: room.id, user_id: target.id, banned_by: userId });
    if (error) { toast.error(error.message); return; }
    setTargetId("");
    toast.success(`تم طرد وحظر ${target.username}`);
    bans.refetch();
  }

  async function unban(id: string) {
    await supabase.from("room_bans").delete().eq("id", id);
    bans.refetch();
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3">
      <div className="mx-auto w-full max-w-lg space-y-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="gold-text text-sm font-black">إدارة الغرفة</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الغرفة"
          className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف الغرفة"
          className="h-14 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
        <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="رسالة الترحيب للزوار"
          className="h-14 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground">خلفية الغرفة</p>
            <input ref={bgRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e, setBackground)} />
            <button onClick={() => bgRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-[11px] font-black disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> من الجهاز
            </button>
            {background ? <img src={background} alt="خلفية" className="h-16 w-full rounded-xl object-cover" /> : null}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground">بنر الغرفة</p>
            <input ref={bannerRef} type="file" accept="image/*,image/gif" hidden onChange={(e) => pickFile(e, setBanner)} />
            <button onClick={() => bannerRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-[11px] font-black disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> رفع بنر
            </button>
            {banner ? <img src={banner} alt="بنر" className="h-16 w-full rounded-xl object-cover" /> : null}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold">
          بنر متحرك
          <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
        </label>

        <label className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold">
          قفل الغرفة برقم سري
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
        </label>
        {locked && (
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="الرقم السري للدخول"
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
        )}

        <button onClick={save} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
          حفظ الإعدادات
        </button>

        <div className="space-y-2 rounded-2xl border border-border p-3">
          <p className="flex items-center gap-1 text-xs font-black"><Shield className="h-4 w-4 text-primary" /> الصلاحيات والحظر</p>
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="آيدي العضو (ID)"
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => grant("admin")} className="rounded-xl bg-secondary py-2 text-[11px] font-black">مدير</button>
            <button onClick={() => grant("moderator")} className="rounded-xl bg-secondary py-2 text-[11px] font-black">مشرف</button>
            <button onClick={banUser} className="flex items-center justify-center gap-1 rounded-xl bg-destructive py-2 text-[11px] font-black text-destructive-foreground">
              <Ban className="h-3.5 w-3.5" /> طرد
            </button>
          </div>

          {(roles.data ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-1.5 text-[11px]">
              <span className="font-bold">{r.profiles?.username} — {r.role === "admin" ? "مدير" : "مشرف"}</span>
              <button onClick={() => revoke(r.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}

          {(bans.data ?? []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl bg-destructive/15 px-3 py-1.5 text-[11px]">
              <span className="font-bold">محظور: {b.profiles?.username}</span>
              <button onClick={() => unban(b.id)} className="text-primary">فك الحظر</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

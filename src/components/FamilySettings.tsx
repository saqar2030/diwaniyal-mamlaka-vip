import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, extOf } from "@/lib/upload";
import { X, Upload, Ban, Shield } from "lucide-react";

const roleLabel: Record<string, string> = { owner: "المالك", manager: "مدير", moderator: "مشرف", member: "عضو" };

export function FamilySettings({
  family, members, userId, canManage, onClose, onChanged,
}: {
  family: any; members: any[]; userId: string; canManage: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [name, setName] = useState(family.name ?? "");
  const [desc, setDesc] = useState(family.description ?? "");
  const [banner, setBanner] = useState(family.banner_url ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bans = useQuery({
    queryKey: ["family-bans", family.id],
    queryFn: async () =>
      (await supabase.from("family_bans").select("*, profiles:user_id(username)").eq("family_id", family.id)).data ?? [],
  });

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { setBanner(await uploadMedia(userId, f, extOf(f))); } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  }

  async function save() {
    const { error } = await supabase.from("families").update({ name, description: desc, banner_url: banner || null }).eq("id", family.id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ القروب");
    onChanged();
  }

  async function setRole(uid: string, role: string) {
    const { error } = await supabase.from("family_members").update({ role }).eq("family_id", family.id).eq("user_id", uid);
    if (error) return toast.error(error.message);
    onChanged();
  }

  async function kick(uid: string) {
    await supabase.from("family_members").delete().eq("family_id", family.id).eq("user_id", uid);
    const { error } = await supabase.from("family_bans").insert({ family_id: family.id, user_id: uid, banned_by: userId });
    if (error) toast.error(error.message); else toast.success("تم طرد العضو");
    bans.refetch(); onChanged();
  }

  async function unban(id: string) {
    await supabase.from("family_bans").delete().eq("id", id);
    toast.success("تم سحب الطرد، يقدر يرجع للقروب");
    bans.refetch();
  }

  const approved = members.filter((m) => m.status === "approved" && m.user_id !== family.owner_id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3">
      <div className="mx-auto w-full max-w-lg space-y-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="gold-text text-sm font-black">إدارة القروب</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        {canManage && (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القروب"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف القروب"
              className="h-16 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary" />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-[11px] font-black disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> تغيير صورة القروب
            </button>
            {banner ? <img src={banner} alt="صورة القروب" className="h-20 w-full rounded-xl object-cover" /> : null}
            <button onClick={save} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">حفظ</button>
          </>
        )}

        <div className="space-y-2 rounded-2xl border border-border p-3">
          <p className="flex items-center gap-1 text-xs font-black"><Shield className="h-4 w-4 text-primary" /> الأعضاء والصلاحيات</p>
          {approved.length === 0 && <p className="text-[11px] text-muted-foreground">لا يوجد أعضاء بعد</p>}
          {approved.map((m) => (
            <div key={m.user_id} className="space-y-1 rounded-xl bg-secondary px-3 py-2 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>{m.profiles?.username ?? "عضو"}</span>
                <span className="text-primary">{roleLabel[m.role] ?? "عضو"}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {canManage && (
                  <>
                    <button onClick={() => setRole(m.user_id, "manager")} className="rounded-lg bg-card px-2 py-1">مدير</button>
                    <button onClick={() => setRole(m.user_id, "moderator")} className="rounded-lg bg-card px-2 py-1">مشرف</button>
                    <button onClick={() => setRole(m.user_id, "member")} className="rounded-lg bg-card px-2 py-1">عضو عادي</button>
                  </>
                )}
                <button onClick={() => kick(m.user_id)} className="flex items-center gap-1 rounded-lg bg-destructive px-2 py-1 text-destructive-foreground">
                  <Ban className="h-3 w-3" /> طرد
                </button>
              </div>
            </div>
          ))}
          {(bans.data ?? []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl bg-destructive/15 px-3 py-1.5 text-[11px]">
              <span className="font-bold">مطرود: {b.profiles?.username}</span>
              <button onClick={() => unban(b.id)} className="text-primary">سحب الطرد</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

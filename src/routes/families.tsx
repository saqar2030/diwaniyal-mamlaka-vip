import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia, extOf } from "@/lib/upload";
import { Users, Plus, Upload, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/families")({
  head: () => ({
    meta: [
      { title: "قروبات ديوانية المملكة" },
      { name: "description", content: "أنشئ قروبك ببنر متحرك، تحكّم بطلبات الانضمام، وتحدّث مع أعضائك بالصوت والصورة." },
      { property: "og:title", content: "قروبات ديوانية المملكة" },
      { property: "og:description", content: "قروبات بأعضاء ودردشة صوتية ونصية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FamiliesPage,
});

function FamiliesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [banner, setBanner] = useState("");
  const [animated, setAnimated] = useState(true);
  const [approval, setApproval] = useState(true);
  const [busy, setBusy] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);

  const families = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*, family_members(user_id, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function pickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setBusy(true);
    try {
      setBanner(await uploadMedia(user.id, file, extOf(file)));
      toast.success("تم رفع البنر");
    } catch {
      toast.error("تعذّر رفع البنر");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (!name.trim()) { toast.error("اكتب اسم القروب"); return; }
    const { data, error } = await supabase
      .from("families")
      .insert({
        name: name.trim(),
        description: desc.trim(),
        owner_id: user.id,
        banner_url: banner || null,
        banner_animated: animated,
        requires_approval: approval,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("family_members").insert({ family_id: data.id, user_id: user.id, role: "owner", status: "approved" });
    setOpen(false); setName(""); setDesc(""); setBanner("");
    qc.invalidateQueries({ queryKey: ["families"] });
  }

  async function toggleJoin(f: any, isMember: boolean) {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (isMember) {
      await supabase.from("family_members").delete().eq("family_id", f.id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("family_members").insert({
        family_id: f.id, user_id: user.id, status: f.requires_approval ? "pending" : "approved",
      });
      if (error) { toast.error(error.message); return; }
      toast.success(f.requires_approval ? "تم إرسال طلب الانضمام" : "انضممت للقروب");
    }
    qc.invalidateQueries({ queryKey: ["families"] });
  }

  return (
    <AppShell title="القروبات">
      <div className="space-y-3 px-4 py-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> إنشاء قروب
        </button>

        {open && (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم القروب"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="نبذة عن القروب"
              className="h-16 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <input ref={bannerRef} type="file" accept="image/*,image/gif" hidden onChange={pickBanner} />
            <button onClick={() => bannerRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-2 text-[11px] font-black disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> رفع بنر القروب
            </button>
            {banner ? <img src={banner} alt="بنر" className={`h-20 w-full rounded-xl object-cover ${animated ? "banner-animated" : ""}`} /> : null}
            <label className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold">
              بنر متحرك
              <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold">
              الانضمام بموافقة المالك
              <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
            </label>
            <button onClick={create} className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
              حفظ
            </button>
          </div>
        )}

        {(families.data ?? []).map((f: any) => {
          const mine = (f.family_members ?? []).find((m: any) => m.user_id === user?.id);
          const isMember = Boolean(mine);
          const approved = mine?.status === "approved";
          const count = (f.family_members ?? []).filter((m: any) => m.status === "approved").length;
          return (
            <div key={f.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              {f.banner_url ? (
                <img src={f.banner_url} alt={f.name} className={`h-20 w-full object-cover ${f.banner_animated ? "banner-animated" : ""}`} />
              ) : null}
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-black text-primary">🦅 {f.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{f.description}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {count} عضو
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => toggleJoin(f, isMember)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                      isMember ? "bg-secondary" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isMember ? (approved ? "مغادرة" : "إلغاء الطلب") : "انضمام"}
                  </button>
                  {approved && (
                    <Link
                      to="/family/$familyId"
                      params={{ familyId: f.id }}
                      className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-black"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-primary" /> الدردشة
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!families.isLoading && (families.data ?? []).length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">لا توجد قروبات بعد.</p>
        )}
      </div>
    </AppShell>
  );
}

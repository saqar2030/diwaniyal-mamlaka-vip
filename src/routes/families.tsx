import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Plus } from "lucide-react";

export const Route = createFileRoute("/families")({
  head: () => ({
    meta: [
      { title: "قروبات ديوانية المملكة" },
      { name: "description", content: "أنشئ قروبك أو انضم لقروبات الأعضاء في ديوانية المملكة." },
      { property: "og:title", content: "قروبات ديوانية المملكة" },
      { property: "og:description", content: "قروبات الأعضاء والانضمام إليها." },
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

  const families = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*, family_members(user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (!name.trim()) { toast.error("اكتب اسم القروب"); return; }
    const { data, error } = await supabase
      .from("families")
      .insert({ name: name.trim(), description: desc.trim(), owner_id: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("family_members").insert({ family_id: data.id, user_id: user.id });
    setOpen(false);
    setName("");
    setDesc("");
    qc.invalidateQueries({ queryKey: ["families"] });
  }

  async function toggleJoin(familyId: string, isMember: boolean) {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (isMember) await supabase.from("family_members").delete().eq("family_id", familyId).eq("user_id", user.id);
    else await supabase.from("family_members").insert({ family_id: familyId, user_id: user.id });
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
            <button onClick={create} className="w-full rounded-xl bg-secondary py-2 text-xs font-black">
              حفظ
            </button>
          </div>
        )}

        {(families.data ?? []).map((f: any) => {
          const isMember = (f.family_members ?? []).some((m: any) => m.user_id === user?.id);
          return (
            <div key={f.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-primary">🦅 {f.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{f.description}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {(f.family_members ?? []).length} عضو
                  </p>
                </div>
                <button
                  onClick={() => toggleJoin(f.id, isMember)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                    isMember ? "bg-secondary" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isMember ? "مغادرة" : "انضمام"}
                </button>
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

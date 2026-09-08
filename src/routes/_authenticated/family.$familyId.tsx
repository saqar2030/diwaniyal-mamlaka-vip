import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatComposer, MessageBody, type OutgoingMessage } from "@/components/ChatComposer";
import { ArrowRight, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/family/$familyId")({
  component: FamilyChatPage,
});

function FamilyChatPage() {
  const { familyId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const end = useRef<HTMLDivElement>(null);

  const family = useQuery({
    queryKey: ["family", familyId],
    queryFn: async () => (await supabase.from("families").select("*").eq("id", familyId).maybeSingle()).data,
  });

  const members = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: async () =>
      (await supabase
        .from("family_members")
        .select("*, profiles:user_id(username, avatar_url, display_id)")
        .eq("family_id", familyId)).data ?? [],
  });

  const messages = useQuery({
    queryKey: ["family-messages", familyId],
    queryFn: async () =>
      (await supabase
        .from("family_messages")
        .select("*, profiles:user_id(username, avatar_url)")
        .eq("family_id", familyId)
        .order("created_at")
        .limit(200)).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel(`family:${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_messages", filter: `family_id=eq.${familyId}` }, () =>
        qc.invalidateQueries({ queryKey: ["family-messages", familyId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [familyId, qc]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data]);

  const isOwner = family.data?.owner_id === user?.id;
  const pending = (members.data ?? []).filter((m: any) => m.status === "pending");

  async function send(m: OutgoingMessage) {
    if (!user) return;
    const { error } = await supabase.from("family_messages").insert({
      family_id: familyId, user_id: user.id, content: m.content, kind: m.kind, media_url: m.media_url,
    });
    if (error) toast.error(error.message);
  }

  async function decide(userId: string, approve: boolean) {
    if (approve) await supabase.from("family_members").update({ status: "approved" }).eq("family_id", familyId).eq("user_id", userId);
    else await supabase.from("family_members").delete().eq("family_id", familyId).eq("user_id", userId);
    members.refetch();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/families" })} className="text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="gold-text text-sm font-black">🦅 {family.data?.name ?? "قروب"}</h1>
          <p className="text-[10px] text-muted-foreground">
            {(members.data ?? []).filter((m: any) => m.status === "approved").length} عضو
          </p>
        </div>
      </header>

      {family.data?.banner_url ? (
        <img
          src={family.data.banner_url}
          alt="بنر القروب"
          className={`h-24 w-full object-cover ${family.data.banner_animated ? "banner-animated" : ""}`}
        />
      ) : null}

      {isOwner && pending.length > 0 && (
        <div className="space-y-2 border-b border-border px-4 py-3">
          <p className="text-xs font-black text-primary">طلبات الانضمام</p>
          {pending.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[11px]">
              <span className="font-bold">{m.profiles?.username}</span>
              <div className="flex gap-2">
                <button onClick={() => decide(m.user_id, true)} className="text-emerald-400"><Check className="h-4 w-4" /></button>
                <button onClick={() => decide(m.user_id, false)} className="text-destructive"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {(messages.data ?? []).map((m: any) => (
          <div key={m.id} className="flex items-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs">
              {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}
            </div>
            <div className="rounded-2xl rounded-tr-sm bg-card px-3 py-1.5">
              <p className="text-[10px] font-black text-primary">{m.profiles?.username ?? "عضو"}</p>
              <div className="text-xs"><MessageBody kind={m.kind} content={m.content} mediaUrl={m.media_url} /></div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </section>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
        <ChatComposer userId={user?.id} onSend={send} placeholder="رسالة للقروب…" />
      </div>
    </div>
  );
}

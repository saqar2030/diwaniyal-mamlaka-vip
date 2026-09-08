import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatComposer, MessageBody, type OutgoingMessage } from "@/components/ChatComposer";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (s: Record<string, unknown>) => ({ to: typeof s['to'] === "string" ? (s['to'] as string) : undefined }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [active, setActive] = useState<string | null>(search.to ?? null);

  useEffect(() => {
    if (search.to) setActive(search.to);
  }, [search.to]);

  const dms = useQuery({
    queryKey: ["dms"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("direct_messages").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const partnerIds = Array.from(
    new Set([
      ...(dms.data ?? []).map((m) => (m.sender_id === user?.id ? m.receiver_id : m.sender_id)),
      ...(active ? [active] : []),
    ]),
  );

  const partners = useQuery({
    queryKey: ["dm-partners", partnerIds.join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", partnerIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dms")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () =>
        qc.invalidateQueries({ queryKey: ["dms"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  async function send(m: OutgoingMessage) {
    if (!user || !active) return;
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: active,
      content: m.content,
      kind: m.kind,
      media_url: m.media_url,
    });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["dms"] });
  }

  const thread = (dms.data ?? []).filter((m) => m.sender_id === active || m.receiver_id === active);
  const activeName = (partners.data ?? []).find((p) => p.id === active)?.username;

  return (
    <AppShell title="الرسائل">
      {!active ? (
        <div className="space-y-2 px-4 py-4">
          {(partners.data ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-right"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm">
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}
              </div>
              <span className="text-xs font-black">{p.username}</span>
            </button>
          ))}
          {partnerIds.length === 0 && (
            <p className="py-10 text-center text-xs text-muted-foreground">
              لا توجد محادثات — افتح ملف أي عضو وابدأ محادثة.
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-h-[70dvh] flex-col px-4 py-3">
          <button onClick={() => setActive(null)} className="mb-2 text-xs font-bold text-primary">
            ← كل المحادثات {activeName ? `• ${activeName}` : ""}
          </button>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {thread.map((m: any) => (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
                  m.sender_id === user?.id ? "ms-auto bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                <MessageBody kind={m.kind} content={m.content} mediaUrl={m.media_url} />
              </div>
            ))}
          </div>
          <div className="sticky bottom-20 mt-2">
            <ChatComposer userId={user?.id} onSend={send} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

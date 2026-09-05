import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRoom } from "@/lib/useVoiceRoom";
import { formatCoins } from "@/lib/queries";
import { ArrowRight, Gift, Mic, MicOff, Send, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/room/$roomId")({
  component: RoomPage,
});

type Seat = {
  id: string;
  seat_index: number;
  user_id: string | null;
  is_muted: boolean;
  is_locked: boolean;
};

function RoomPage() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [flying, setFlying] = useState<{ id: string; emoji: string } | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const room = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const seats = useQuery({
    queryKey: ["seats", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_seats")
        .select("*")
        .eq("room_id", roomId)
        .order("seat_index");
      if (error) throw error;
      return (data ?? []) as Seat[];
    },
  });

  const seatUserIds = (seats.data ?? []).map((s) => s.user_id).filter(Boolean) as string[];

  const people = useQuery({
    queryKey: ["seat-profiles", seatUserIds.join(",")],
    enabled: seatUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, coins")
        .in("id", seatUserIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const messages = useQuery({
    queryKey: ["room-messages", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("*, profiles:user_id(username, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const gifts = useQuery({
    queryKey: ["gifts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gifts").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mySeat = (seats.data ?? []).find((s) => s.user_id === user?.id);
  const voice = useVoiceRoom(roomId, user?.id, Boolean(mySeat) && !mySeat?.is_muted);

  useEffect(() => {
    const ch = supabase
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats", filter: `room_id=eq.${roomId}` }, () =>
        qc.invalidateQueries({ queryKey: ["seats", roomId] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, () =>
        qc.invalidateQueries({ queryKey: ["room-messages", roomId] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_events", filter: `room_id=eq.${roomId}` }, async (p) => {
        const giftId = (p.new as { gift_id: string }).gift_id;
        const g = (gifts.data ?? []).find((x) => x.id === giftId);
        if (g) {
          setFlying({ id: crypto.randomUUID(), emoji: g.emoji });
          setTimeout(() => setFlying(null), 2400);
        }
        qc.invalidateQueries({ queryKey: ["seat-profiles"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, qc, gifts.data]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  async function takeSeat(seat: Seat) {
    if (!user) return;
    if (seat.user_id && seat.user_id !== user.id) return toast.error("المقعد مشغول");
    if (seat.is_locked) return toast.error("المقعد مقفل");
    if (seat.user_id === user.id) {
      await supabase.from("room_seats").update({ user_id: null }).eq("id", seat.id);
    } else {
      if (mySeat) await supabase.from("room_seats").update({ user_id: null }).eq("id", mySeat.id);
      const { error } = await supabase.from("room_seats").update({ user_id: user.id }).eq("id", seat.id);
      if (error) toast.error("تعذّر الصعود على المايك");
    }
    qc.invalidateQueries({ queryKey: ["seats", roomId] });
  }

  async function toggleMute() {
    if (!mySeat) return;
    await supabase.from("room_seats").update({ is_muted: !mySeat.is_muted }).eq("id", mySeat.id);
    qc.invalidateQueries({ queryKey: ["seats", roomId] });
  }

  async function send() {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("room_messages").insert({ room_id: roomId, user_id: user.id, content });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["room-messages", roomId] });
  }

  async function sendGift(giftId: string) {
    if (!giftFor) return;
    const { error } = await supabase.rpc("send_gift", {
      _gift_id: giftId,
      _receiver_id: giftFor,
      _room_id: roomId,
    });
    if (error) return toast.error(error.message);
    setGiftFor(null);
    toast.success("تم إرسال الهدية 🎁");
    qc.invalidateQueries({ queryKey: ["seat-profiles"] });
  }

  async function leave() {
    if (mySeat) await supabase.from("room_seats").update({ user_id: null }).eq("id", mySeat.id);
    navigate({ to: "/" });
  }

  const profileOf = (id: string | null) => (people.data ?? []).find((p) => p.id === id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <button onClick={leave} className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <ArrowRight className="h-4 w-4" /> خروج
        </button>
        <div className="text-center">
          <h1 className="gold-text text-sm font-black">{room.data?.name ?? "غرفة"}</h1>
          <p className="text-[10px] text-muted-foreground">{room.data?.description}</p>
        </div>
        <button onClick={leave} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <section className="relative grid grid-cols-4 gap-3 px-4 py-5">
        {(seats.data ?? []).map((seat) => {
          const p = profileOf(seat.user_id);
          const isSpeaking = seat.user_id ? voice.speaking[seat.user_id] : false;
          return (
            <button
              key={seat.id}
              onClick={() => (seat.user_id && seat.user_id !== user?.id ? setGiftFor(seat.user_id) : takeSeat(seat))}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xl ${
                  seat.user_id ? "gold-ring" : ""
                } ${isSpeaking ? "speaking-glow" : ""}`}
              >
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" />
                ) : seat.user_id ? (
                  "👤"
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="w-full truncate text-center text-[10px] font-bold">
                {p?.username ?? `مقعد ${seat.seat_index}`}
              </span>
            </button>
          );
        })}
        {flying && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-5xl gift-fly">
            {flying.emoji}
          </div>
        )}
      </section>

      <section className="flex-1 space-y-2 overflow-y-auto border-t border-border px-4 py-3">
        {(messages.data ?? []).map((m: any) => (
          <div key={m.id} className="flex items-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs">
              {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}
            </div>
            <div className="rounded-2xl rounded-tr-sm bg-card px-3 py-1.5">
              <p className="text-[10px] font-black text-primary">{m.profiles?.username ?? "عضو"}</p>
              <p className="text-xs">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEnd} />
      </section>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
        <button
          onClick={mySeat ? toggleMute : () => toast.info("اصعد على مقعد أولاً")}
          className={`rounded-full p-2.5 ${mySeat && !mySeat.is_muted ? "bg-emerald-500 text-white" : "bg-secondary"}`}
        >
          {mySeat && !mySeat.is_muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رسالتك…"
          className="flex-1 rounded-full border border-border bg-input px-4 py-2 text-xs outline-none focus:border-primary"
        />
        <button onClick={() => setGiftFor(seatUserIds.find((id) => id !== user?.id) ?? null)} className="rounded-full bg-secondary p-2.5">
          <Gift className="h-4 w-4 text-primary" />
        </button>
        <button onClick={send} className="rounded-full bg-primary p-2.5 text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>

      {giftFor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setGiftFor(null)}>
          <div
            className="mx-auto w-full max-w-lg rounded-t-3xl border border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-black">
              إهداء إلى {profileOf(giftFor)?.username ?? "عضو"}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {(gifts.data ?? []).map((g) => (
                <button
                  key={g.id}
                  onClick={() => sendGift(g.id)}
                  className="rounded-2xl border border-border bg-secondary p-3 text-center transition-colors hover:border-primary"
                >
                  <div className="text-2xl">{g.emoji}</div>
                  <div className="mt-1 text-[10px] font-bold">{g.name}</div>
                  <div className="text-[10px] text-primary">{formatCoins(g.price)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

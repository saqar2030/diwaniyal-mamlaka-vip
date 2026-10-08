import { FramedAvatar, VipBadge, EntryOverlay, ENTRIES } from "@/components/Vip";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRoom } from "@/lib/useVoiceRoom";
import { formatCoins } from "@/lib/queries";
import { RoomSettings, type RoomRow } from "@/components/RoomSettings";
import { ArrowRight, Gift, Mic, MicOff, Send, LogOut, Settings, Lock, Ban, VolumeX, Volume2, User, Coins, Video, VideoOff } from "lucide-react";

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
  const [menuFor, setMenuFor] = useState<Seat | null>(null);
  const [flying, setFlying] = useState<{ id: string; emoji: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const room = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (error) throw error;
      return data as RoomRow | null;
    },
  });

  const staff = useQuery({
    queryKey: ["room-staff", roomId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("room_roles")
        .select("role")
        .eq("room_id", roomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.role ?? null;
    },
  });

  const banned = useQuery({
    queryKey: ["room-banned", roomId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("room_bans")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return Boolean(data);
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
        .select("id, username, avatar_url, coins, vip_level, active_frame")
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
        .select("*, profiles:user_id(username, avatar_url, vip_level, active_frame, active_entry)")
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

  const isOwner = room.data?.owner_id === user?.id;
  const isStaff = isOwner || Boolean(staff.data);
  const mySeat = (seats.data ?? []).find((s) => s.user_id === user?.id);
  const voice = useVoiceRoom(roomId, user?.id, Boolean(mySeat) && !mySeat?.is_muted);

  useEffect(() => {
    const ch = supabase
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats", filter: `room_id=eq.${roomId}` }, () =>
        qc.invalidateQueries({ queryKey: ["seats", roomId] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, async (p) => {
        qc.invalidateQueries({ queryKey: ["room-messages", roomId] });
        const m = p.new as { kind: string; content: string; user_id: string };
        if (m.kind === "entry") {
          const { data: pr } = await supabase.from("profiles").select("username").eq("id", m.user_id).maybeSingle();
          setEntryFx({ id: crypto.randomUUID(), entry: m.content, name: pr?.username ?? "عضو" });
        }
      })
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

  // الدخول المميز
  const [entryFx, setEntryFx] = useState<{ id: string; entry: string; name: string } | null>(null);
  const entered = useRef(false);
  useEffect(() => {
    if (entered.current || !user) return;
    entered.current = true;
    void (async () => {
      const { data } = await supabase.from("profiles").select("active_entry").eq("id", user.id).maybeSingle();
      if (data?.active_entry) await supabase.from("room_messages").insert({ room_id: roomId, user_id: user.id, content: data.active_entry, kind: "entry" });
    })();
  }, [user, roomId]);

  // رسالة الترحيب
  const welcomed = useRef(false);
  useEffect(() => {
    if (welcomed.current || !room.data?.welcome_message) return;
    welcomed.current = true;
    toast(room.data.welcome_message);
  }, [room.data?.welcome_message]);

  async function takeSeat(seat: Seat) {
    if (!user) return;
    if (seat.is_locked) { toast.error("المقعد مقفل"); return; }
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

  async function staffMute(seat: Seat) {
    await supabase.from("room_seats").update({ is_muted: !seat.is_muted }).eq("id", seat.id);
    setMenuFor(null);
    qc.invalidateQueries({ queryKey: ["seats", roomId] });
  }

  async function staffLock(seat: Seat) {
    await supabase.from("room_seats").update({ is_locked: !seat.is_locked }).eq("id", seat.id);
    setMenuFor(null);
    qc.invalidateQueries({ queryKey: ["seats", roomId] });
  }

  async function staffKick(seat: Seat, ban: boolean) {
    if (!seat.user_id) return;
    await supabase.from("room_seats").update({ user_id: null }).eq("id", seat.id);
    if (ban) await supabase.from("room_bans").insert({ room_id: roomId, user_id: seat.user_id, banned_by: user?.id ?? null });
    setMenuFor(null);
    toast.success(ban ? "تم الطرد والحظر" : "تم إنزاله من المايك");
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
    if (!giftFor) { toast.error(giftTargets.length ? "اختر الشخص أولاً من الأعلى" : "لا يوجد أحد غيرك في الغرفة"); return; }
    const { error } = await supabase.rpc("send_gift", {
      _gift_id: giftId,
      _receiver_id: giftFor,
      _room_id: roomId,
    });
    if (error) { toast.error(error.message); return; }
    setGiftFor(null);
    toast.success("تم إرسال الهدية 🎁");
    qc.invalidateQueries({ queryKey: ["seat-profiles"] });
  }

  async function leave() {
    if (mySeat) await supabase.from("room_seats").update({ user_id: null }).eq("id", mySeat.id);
    navigate({ to: "/" });
  }

  const profileOf = (id: string | null) => (people.data ?? []).find((p) => p.id === id);
  const giftTargets = (() => {
    const map = new Map<string, string>();
    seatUserIds.forEach((id) => map.set(id, profileOf(id)?.username ?? "عضو"));
    (messages.data ?? []).forEach((m: any) => { if (!map.has(m.user_id)) map.set(m.user_id, m.profiles?.username ?? "عضو"); });
    if (room.data?.owner_id && !map.has(room.data.owner_id)) map.set(room.data.owner_id, "صاحب الغرفة");
    if (user?.id) map.delete(user.id);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  })();

  if (banned.data) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <Ban className="h-10 w-10 text-destructive" />
        <p className="text-sm font-black">أنت محظور من هذه الغرفة.</p>
        <button onClick={() => navigate({ to: "/" })} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const needsPin = room.data?.is_locked && !unlocked && !isStaff;
  if (needsPin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <Lock className="h-8 w-8 text-primary" />
        <p className="text-sm font-black">هذه الغرفة مقفلة برقم سري</p>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-input px-3 py-2 text-center text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => (pinInput === room.data?.room_pin ? setUnlocked(true) : toast.error("رقم غير صحيح"))}
          className="w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground"
        >
          دخول
        </button>
        <button onClick={() => navigate({ to: "/" })} className="text-[11px] text-muted-foreground">رجوع</button>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-cover bg-center"
      style={room.data?.background_url ? { backgroundImage: `url(${room.data.background_url})` } : undefined}
    >
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <button onClick={leave} className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <ArrowRight className="h-4 w-4" /> خروج
        </button>
        <div className="text-center">
          <h1 className="gold-text text-sm font-black">{room.data?.name ?? "غرفة"}</h1>
          <p className="text-[10px] text-muted-foreground">{room.data?.description}</p>
        </div>
        {isOwner ? (
          <button onClick={() => setShowSettings(true)} className="text-primary">
            <Settings className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={leave} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </header>

      {room.data?.banner_url ? (
        <img
          src={room.data.banner_url}
          alt="بنر الغرفة"
          className={`h-20 w-full object-cover ${room.data.banner_animated ? "banner-animated" : ""}`}
        />
      ) : null}

      <section className="relative grid grid-cols-4 gap-3 bg-background/70 px-4 py-5 backdrop-blur-sm">
        {(seats.data ?? []).map((seat) => {
          const p = profileOf(seat.user_id);
          const isSpeaking = seat.user_id ? voice.speaking[seat.user_id] : false;
          return (
            <button
              key={seat.id}
              onClick={() => {
                if ((seat.user_id && seat.user_id !== user?.id) || (isStaff && !seat.user_id)) setMenuFor(seat);
                else takeSeat(seat);
              }}
              className="flex flex-col items-center gap-1"
            >
              <FramedAvatar size={56} frame={(p as any)?.active_frame} className={`mt-2 ${isSpeaking ? "speaking-glow rounded-full" : ""}`}>
                {seat.user_id && voice.videos[seat.user_id] ? (
                  <SeatVideo stream={voice.videos[seat.user_id]!} muted />
                ) : p?.avatar_url ? (
                  <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" />
                ) : seat.user_id ? (
                  "👤"
                ) : seat.is_locked ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
                {seat.user_id && seat.is_muted ? (
                  <span className="absolute bottom-0 w-full bg-black/60 py-0.5"><MicOff className="mx-auto h-3 w-3 text-destructive" /></span>
                ) : null}
              </FramedAvatar>
              <span className="w-full truncate text-center text-[10px] font-bold">
                {p?.username ?? `مقعد ${seat.seat_index}`}<VipBadge level={(p as any)?.vip_level} />
              </span>
            </button>
          );
        })}
        {entryFx && <EntryOverlay key={entryFx.id} entry={entryFx.entry} name={entryFx.name} onDone={() => setEntryFx(null)} />}
        {flying && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-5xl gift-fly">
            {flying.emoji}
          </div>
        )}
      </section>

      <section className="flex-1 space-y-2 overflow-y-auto border-t border-border bg-background/70 px-4 py-3 backdrop-blur-sm">
        {(messages.data ?? []).map((m: any) => m.kind === "entry" ? (
          <div key={m.id} className="vip-card mx-auto w-fit rounded-full px-3 py-1 text-[11px]">
            {ENTRIES[m.content]?.emoji ?? "👑"} <b className="text-primary">{m.profiles?.username}</b><VipBadge level={m.profiles?.vip_level} /> دخل {ENTRIES[m.content]?.label ?? ""}
          </div>
        ) : (
          <div key={m.id} className="flex items-start gap-2">
            <FramedAvatar size={28} src={m.profiles?.avatar_url} frame={m.profiles?.active_frame} className="mt-2" />
            <div className={`rounded-2xl rounded-tr-sm px-3 py-1.5 ${m.profiles?.vip_level >= 4 ? "vip-card" : "bg-card"}`}>
              <p className="text-[10px] font-black text-primary">{m.profiles?.username ?? "عضو"}<VipBadge level={m.profiles?.vip_level} /></p>
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
        {mySeat && (
          <button
            onClick={async () => { const ok = await voice.toggleCam(); if (!ok) toast.error("ما قدرنا نشغل الكاميرا، اسمح للمتصفح باستخدامها"); }}
            className={`rounded-full p-2.5 ${voice.camOn ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            aria-label="الكاميرا"
          >
            {voice.camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رسالتك…"
          className="flex-1 rounded-full border border-border bg-input px-4 py-2 text-xs outline-none focus:border-primary"
        />
        <button onClick={() => setGiftFor(giftTargets.length === 1 ? giftTargets[0]!.id : "")} className="rounded-full bg-secondary p-2.5">
          <Gift className="h-4 w-4 text-primary" />
        </button>
        <button onClick={send} className="rounded-full bg-primary p-2.5 text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>

      {menuFor && !menuFor.user_id && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setMenuFor(null)}>
          <div className="mx-auto w-full max-w-lg space-y-2 rounded-t-3xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-center text-sm font-black">مقعد {menuFor.seat_index}</p>
            {!menuFor.is_locked && (
              <button onClick={() => { const s = menuFor; setMenuFor(null); takeSeat(s); }}
                className="flex w-full items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">
                <Mic className="h-4 w-4" /> اصعد على المقعد
              </button>
            )}
            <button onClick={() => staffLock(menuFor)} className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-black">
              <Lock className="h-4 w-4" /> {menuFor.is_locked ? "فتح المقعد" : "قفل المقعد"}
            </button>
          </div>
        </div>
      )}

      {menuFor && menuFor.user_id && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setMenuFor(null)}>
          <div className="mx-auto w-full max-w-lg space-y-2 rounded-t-3xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-center text-sm font-black">{profileOf(menuFor.user_id)?.username ?? "عضو"}</p>
            <button
              onClick={() => { setGiftFor(menuFor.user_id); setMenuFor(null); }}
              className="flex w-full items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
            >
              <Gift className="h-4 w-4" /> إهداء
            </button>
            <button
              onClick={() => { const id = menuFor.user_id!; setMenuFor(null); navigate({ to: "/profile/$userId", params: { userId: id } }); }}
              className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-black"
            >
              <User className="h-4 w-4 text-primary" /> عرض الملف
            </button>
            {isStaff && (
              <>
                <button onClick={() => staffMute(menuFor)} className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-black">
                  {menuFor.is_muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {menuFor.is_muted ? "فك الكتم" : "كتم"}
                </button>
                <button onClick={() => staffLock(menuFor)} className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-black">
                  <Lock className="h-4 w-4" /> {menuFor.is_locked ? "فتح المقعد" : "قفل المقعد"}
                </button>
                <button onClick={() => staffKick(menuFor, false)} className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-black">
                  <MicOff className="h-4 w-4" /> إنزال من المايك
                </button>
                <button onClick={() => staffKick(menuFor, true)} className="flex w-full items-center gap-2 rounded-xl bg-destructive px-3 py-2 text-xs font-black text-destructive-foreground">
                  <Ban className="h-4 w-4" /> طرد وحظر
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {giftFor !== null && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setGiftFor(null)}>
          <div
            className="mx-auto w-full max-w-lg rounded-t-3xl border border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-center text-sm font-black">
              {giftFor ? `إهداء إلى ${giftTargets.find((t) => t.id === giftFor)?.name ?? profileOf(giftFor)?.username ?? "عضو"}` : "اختر من تريد إهداءه"}
            </p>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {giftTargets.map((t) => (
                <button key={t.id} onClick={() => setGiftFor(t.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${giftFor === t.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {t.name}
                </button>
              ))}
              {giftTargets.length === 0 && (
                <p className="text-[11px] text-muted-foreground">لا يوجد أحد غيرك في الغرفة لإهدائه حالياً</p>
              )}
            </div>
            <Link to="/wallet" className="mb-3 flex items-center justify-center gap-1 rounded-xl bg-primary/15 py-2 text-[11px] font-black text-primary">
              <Coins className="h-3.5 w-3.5" /> شحن العملات بالريال السعودي
            </Link>
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

      {showSettings && room.data && user && (
        <RoomSettings room={room.data} userId={user.id} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function SeatVideo({ stream, muted }: { stream: MediaStream; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRoom } from "@/lib/useVoiceRoom";
import { absSquare, FINISH, legalMoves, move, newLudo, roll, SAFE, SEAT_COLORS, SEAT_NAMES, type LudoState } from "@/lib/ludo";

export const Route = createFileRoute("/_authenticated/table/$tableId")({
  head: () => ({
    meta: [
      { title: "طاولة لودو | ديوانية المملكة" },
      { name: "description", content: "طاولة لودو جماعية لأربعة لاعبين مع دردشة وصوت مباشر." },
      { property: "og:title", content: "طاولة لودو | ديوانية المملكة" },
      { property: "og:description", content: "العب لودو مع ربعك مع دردشة وصوت." },
    ],
  }),
  component: TablePage,
});

type Msg = { from: string; name: string; text: string; at: number };

function TablePage() {
  const { tableId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [micOn, setMicOn] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const chatRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const table = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase.from("game_tables").select("*").eq("id", tableId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const players = (table.data?.players ?? []) as string[];
  const profiles = useQuery({
    queryKey: ["table-profiles", players.join(",")],
    enabled: players.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", players);
      return data ?? [];
    },
  });
  const nameOf = (id: string) => profiles.data?.find((p) => p.id === id)?.username ?? "لاعب";
  const seat = user ? players.indexOf(user.id) : -1;
  const state = (table.data?.status === "playing" || table.data?.status === "done" ? table.data.state : null) as LudoState | null;

  useEffect(() => {
    const ch = supabase
      .channel(`gt-${tableId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${tableId}` }, () =>
        qc.invalidateQueries({ queryKey: ["table", tableId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tableId, qc]);

  useEffect(() => {
    const ch = supabase.channel(`game-chat:${tableId}`, { config: { broadcast: { self: true } } });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => setMsgs((m) => [...m.slice(-50), payload as Msg])).subscribe();
    chatRef.current = ch;
    return () => { supabase.removeChannel(ch); chatRef.current = null; };
  }, [tableId]);

  const voice = useVoiceRoom(`game-${tableId}`, seat >= 0 ? user?.id : undefined, micOn && seat >= 0);

  async function save(patch: Record<string, unknown>) {
    const { error } = await supabase.from("game_tables").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", tableId);
    if (error) toast.error("تعذّر التحديث");
    qc.invalidateQueries({ queryKey: ["table", tableId] });
  }

  async function join() {
    if (!user || players.includes(user.id) || players.length >= 4) return;
    await save({ players: [...players, user.id] });
  }
  async function leave() {
    if (!user) return;
    await save({ players: players.filter((p) => p !== user.id) });
  }
  async function start() {
    if (players.length < 2) { toast.error("تحتاج لاعبين اثنين على الأقل"); return; }
    await save({ status: "playing", state: newLudo(players.length) });
  }
  async function doRoll() {
    if (!state || state.turn !== seat || state.dice != null) return;
    await save({ state: roll(state, seat, Math.floor(Math.random() * 6) + 1) });
  }
  async function doMove(i: number) {
    if (!state) return;
    const n = move(state, seat, i);
    await save({ state: n, status: n.winner != null ? "done" : "playing" });
  }
  function send() {
    const t = text.trim();
    if (!t || !user) return;
    chatRef.current?.send({ type: "broadcast", event: "msg", payload: { from: user.id, name: nameOf(user.id), text: t, at: Date.now() } });
    setText("");
  }

  if (!table.data) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  const myMoves = state && state.turn === seat ? legalMoves(state, seat) : [];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-6">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/games" className="text-sm text-muted-foreground">→ الصالة</Link>
        <h1 className="gold-text font-black">🎲 لودو المملكة</h1>
        {seat >= 0 ? (
          <button onClick={() => setMicOn((v) => !v)} className={`rounded-full p-2 ${micOn ? "bg-primary text-primary-foreground" : "bg-secondary"}`} aria-label="المايك">
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
        ) : <span className="w-8" />}
      </header>

      <div className="grid grid-cols-4 gap-2 px-3 py-3">
        {[0, 1, 2, 3].map((i) => {
          const pid = players[i];
          const active = state && state.turn === i && state.winner == null;
          return (
            <div key={i} className={`rounded-xl border-2 p-2 text-center text-[11px] ${active ? "animate-pulse" : ""}`} style={{ borderColor: SEAT_COLORS[i] }}>
              <div className="mx-auto mb-1 h-9 w-9 overflow-hidden rounded-full bg-secondary" style={{ boxShadow: pid && voice.speaking[pid] ? `0 0 0 3px ${SEAT_COLORS[i]}` : undefined }}>
                {pid && profiles.data?.find((p) => p.id === pid)?.avatar_url ? <img src={profiles.data.find((p) => p.id === pid)!.avatar_url!} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="truncate font-bold">{pid ? nameOf(pid) : "فاضي"}</div>
              {state && pid && <div className="text-muted-foreground">🏠 {state.tokens[i]?.filter((x) => x === FINISH).length ?? 0}/4</div>}
            </div>
          );
        })}
      </div>

      {table.data.status === "waiting" && (
        <div className="mx-3 space-y-2 rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-sm">بانتظار اللاعبين ({players.length}/4)</p>
          {seat < 0 && players.length < 4 && <button onClick={join} className="w-full rounded-xl bg-primary py-2 font-black text-primary-foreground">اجلس على الطاولة</button>}
          {seat >= 0 && user?.id !== table.data.host_id && <button onClick={leave} className="w-full rounded-xl bg-secondary py-2">مغادرة المقعد</button>}
          {user?.id === table.data.host_id && <button onClick={start} className="w-full rounded-xl bg-primary py-2 font-black text-primary-foreground">ابدأ اللعب</button>}
        </div>
      )}

      {state && (
        <div className="px-3">
          <Board state={state} />
          <p className="my-2 text-center text-sm text-primary">{state.log}</p>
          {state.winner == null && seat >= 0 && state.turn === seat && (
            <div className="space-y-2">
              {state.dice == null ? (
                <button onClick={doRoll} className="w-full rounded-xl bg-primary py-3 text-lg font-black text-primary-foreground">🎲 ارمِ النرد</button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="rounded-lg bg-card px-3 py-2 text-xl font-black">{state.dice}</span>
                  {myMoves.map((i) => (
                    <button key={i} onClick={() => doMove(i)} className="rounded-lg px-3 py-2 text-xs font-black text-black" style={{ background: SEAT_COLORS[seat] }}>
                      حرّك القطعة {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {state.winner == null && state.turn !== seat && <p className="text-center text-xs text-muted-foreground">دور {SEAT_NAMES[state.turn]} ({nameOf(players[state.turn] ?? "")})</p>}
          {state.winner != null && user?.id === table.data.host_id && (
            <button onClick={start} className="mt-2 w-full rounded-xl bg-primary py-2 font-black text-primary-foreground">جولة جديدة</button>
          )}
        </div>
      )}

      <div className="mx-3 mt-4 rounded-2xl border border-border bg-card">
        <div className="h-40 space-y-1 overflow-y-auto p-3 text-xs">
          {msgs.length === 0 && <p className="text-center text-muted-foreground">دردشة الطاولة</p>}
          {msgs.map((m) => <div key={m.at + m.from}><b className="text-primary">{m.name}:</b> {m.text}</div>)}
        </div>
        <div className="flex gap-2 border-t border-border p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب رسالة..." className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none" />
          <button onClick={send} className="rounded-lg bg-primary px-3 text-primary-foreground" aria-label="إرسال"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function Board({ state }: { state: LudoState }) {
  const R = 130, C = 150;
  const pos = (sq: number) => {
    const a = (sq / 52) * Math.PI * 2 - Math.PI / 2;
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  };
  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-xs">
      <circle cx={C} cy={C} r={R + 14} fill="hsl(var(--card, 0 0% 10%))" stroke="#c9a227" strokeWidth={2} />
      {Array.from({ length: 52 }, (_, sq) => {
        const [x, y] = pos(sq) as [number, number];
        const start = sq % 13 === 0 ? SEAT_COLORS[sq / 13] : null;
        return <circle key={sq} cx={x} cy={y} r={7} fill={start ?? (SAFE.has(sq) ? "#5d4a12" : "#2a2a2a")} stroke="#c9a227" strokeWidth={0.6} />;
      })}
      <text x={C} y={C - 40} textAnchor="middle" fill="#c9a227" fontSize={12} fontWeight="bold">ديوانية المملكة</text>
      {state.tokens.map((toks, seat) => {
        const base = toks.filter((p) => p === -1).length;
        const homeCol = toks.filter((p) => p > 50 && p < FINISH);
        return (
          <g key={seat}>
            {toks.map((p, i) => {
              if (p < 0 || p > 50) return null;
              const [x, y] = pos(absSquare(seat, p)) as [number, number];
              return <circle key={i} cx={x + (i % 2) * 3 - 1.5} cy={y + Math.floor(i / 2) * 3 - 1.5} r={5} fill={SEAT_COLORS[seat]} stroke="#fff" strokeWidth={1.5} />;
            })}
            <text x={seat % 2 ? 220 : 80} y={seat < 2 ? 130 : 185} textAnchor="middle" fill={SEAT_COLORS[seat]} fontSize={10} fontWeight="bold">
              {`قاعدة ${base} • ممر ${homeCol.length}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

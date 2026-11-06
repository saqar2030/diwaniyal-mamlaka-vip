// Pure 4-player Ludo rules. Token progress: -1 = base, 0..50 = shared loop,
// 51..56 = home column, 57 = finished.
export type LudoState = {
  turn: number;
  dice: number | null;
  tokens: number[][];
  winner: number | null;
  log: string;
};

export const FINISH = 57;
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const SEAT_COLORS = ["#e53935", "#43a047", "#fdd835", "#1e88e5"];
export const SEAT_NAMES = ["الأحمر", "الأخضر", "الأصفر", "الأزرق"];

export function newLudo(players: number): LudoState {
  return { turn: 0, dice: null, tokens: Array.from({ length: players }, () => [-1, -1, -1, -1]), winner: null, log: "بدأت اللعبة!" };
}

export const absSquare = (seat: number, p: number) => (p + seat * 13) % 52;

export function canMove(p: number, dice: number) {
  if (p === FINISH) return false;
  if (p === -1) return dice === 6;
  return p + dice <= FINISH;
}

export function legalMoves(s: LudoState, seat: number) {
  if (s.dice == null) return [];
  return s.tokens[seat].map((p, i) => (canMove(p, s.dice!) ? i : -1)).filter((i) => i >= 0);
}

const next = (s: LudoState, seat: number) => (seat + 1) % s.tokens.length;

export function roll(s: LudoState, seat: number, dice: number): LudoState {
  const n: LudoState = { ...s, dice, log: `${SEAT_NAMES[seat]} رمى ${dice}` };
  if (legalMoves(n, seat).length === 0) return { ...n, dice: null, turn: next(s, seat), log: n.log + " — لا توجد حركة" };
  return n;
}

export function move(s: LudoState, seat: number, idx: number): LudoState {
  const dice = s.dice!;
  const tokens = s.tokens.map((t) => [...t]);
  const p = tokens[seat][idx];
  const np = p === -1 ? 0 : p + dice;
  tokens[seat][idx] = np;
  let captured = false;
  if (np <= 50) {
    const sq = absSquare(seat, np);
    if (!SAFE.has(sq)) {
      tokens.forEach((t, o) => {
        if (o === seat) return;
        t.forEach((op, j) => { if (op >= 0 && op <= 50 && absSquare(o, op) === sq) { t[j] = -1; captured = true; } });
      });
    }
  }
  const won = tokens[seat].every((x) => x === FINISH);
  const again = dice === 6 || captured || np === FINISH;
  let log = `${SEAT_NAMES[seat]} حرّك قطعة`;
  if (captured) log += " وأكل قطعة خصم! 💥";
  if (np === FINISH) log += " ووصلت للبيت 🏠";
  return { tokens, dice: null, winner: won ? seat : null, turn: won || again ? seat : next(s, seat), log: won ? `🏆 ${SEAT_NAMES[seat]} فاز!` : log };
}

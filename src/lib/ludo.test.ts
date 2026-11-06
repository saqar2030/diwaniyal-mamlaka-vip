// @ts-nocheck
import { describe, expect, it } from "vitest";
import { move, newLudo, roll } from "./ludo";

describe("ludo rules", () => {
  it("needs a 6 to leave base", () => {
    const s = roll(newLudo(4), 0, 3);
    expect(s.turn).toBe(1);
    expect(s.dice).toBeNull();
  });
  it("captures opponent on shared non-safe square", () => {
    const s = newLudo(2);
    s.tokens[0][0] = 10; // abs 10
    s.tokens[1][0] = 49; // abs (49+13)%52 = 10
    s.tokens[0][1] = 7;
    const r = move({ ...s, dice: 3 }, 0, 1);
    expect(r.tokens[1][0]).toBe(-1);
    expect(r.turn).toBe(0);
  });
});

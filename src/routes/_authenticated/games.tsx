import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/BottomNav";
import BalootGame from "@/components/BalootGame";
import BasraGame from "@/components/BasraGame";
import CarromGame from "@/components/CarromGame";
import DominoGame from "@/components/DominoGame";
import LudoGame from "@/components/LudoGame";
import UnoGame from "@/components/UnoGame";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({
    meta: [
      { title: "صالة الألعاب | ديوانية المملكة" },
      { name: "description", content: "العب بلوت، لودو، كيرم، دومينو وأونو مع أهل الديوانية." },
      { property: "og:title", content: "صالة الألعاب | ديوانية المملكة" },
      { property: "og:description", content: "ألعاب جماعية داخل ديوانية المملكة." },
    ],
  }),
  component: GamesPage,
});

const games = [
  { id: "baloot", name: "بلوت سعودي", C: BalootGame },
  { id: "ludo", name: "لودو المملكة", C: LudoGame },
  { id: "carrom", name: "كيرم خشب", C: CarromGame },
  { id: "domino", name: "دومينو", C: DominoGame },
  { id: "basra", name: "بصرة", C: BasraGame },
  { id: "uno", name: "أونو", C: UnoGame },
] as const;

function GamesPage() {
  const [active, setActive] = useState<string>(games[0].id);
  const Current = games.find((g) => g.id === active)?.C ?? BalootGame;
  return (
    <AppShell title="صالة الألعاب">
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${active === g.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="px-2">
        <Current />
      </div>
    </AppShell>
  );
}

import { useId } from "react";

// صندوق كنوز 🪎 — مغلق (مقفول)، جاهز (متوهج ينبض)، مفتوح (بالمكافأة)
export function TreasureChest({ state, className }: { state: "locked" | "ready" | "opened"; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wood = `w${uid}`, woodD = `wd${uid}`, gold = `g${uid}`, glow = `gl${uid}`, coin = `c${uid}`;
  const opened = state === "opened";
  const ready = state === "ready";

  return (
    <svg viewBox="0 0 72 66" className={className} role="img" aria-label={
      opened ? "صندوق مفتوح" : ready ? "صندوق جاهز للفتح" : "صندوق مقفول"
    }>
      <defs>
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="0.5" stopColor="#6b3f1d" />
          <stop offset="1" stopColor="#4a2a12" />
        </linearGradient>
        <linearGradient id={woodD} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a06a33" />
          <stop offset="1" stopColor="#5d3717" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e27a" />
          <stop offset="0.45" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8c6d1f" />
        </linearGradient>
        <radialGradient id={coin} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffe9a0" />
          <stop offset="1" stopColor="#c9992b" />
        </radialGradient>
        {ready && (
          <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f6d365" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f6d365" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {/* هالة التوهج للجاهز */}
      {ready && <circle cx="36" cy="36" r="30" fill={`url(#${glow})`} className="animate-pulse" />}

      {/* العملات تطلع من الصندوق المفتوح */}
      {opened && (
        <g>
          <circle cx="24" cy="16" r="4.5" fill={`url(#${coin})`} />
          <circle cx="36" cy="11" r="5.5" fill={`url(#${coin})`} />
          <circle cx="48" cy="15" r="4.5" fill={`url(#${coin})`} />
          <circle cx="30" cy="6" r="3.5" fill={`url(#${coin})`} />
          <circle cx="43" cy="5" r="3" fill={`url(#${coin})`} />
        </g>
      )}

      <g transform={opened ? "" : ""}>
        {/* الغطاء — مفتوح يرتفع ومائل */}
        <g transform={opened ? "translate(0 -4) rotate(-22 36 32)" : ready ? "translate(0 -2)" : ""}>
          <path
            d={opened ? "M10 30 Q10 13 36 13 Q62 13 62 30 L62 34 Q36 40 10 34 Z" : "M10 30 Q10 13 36 13 Q62 13 62 30 L62 36 Q36 40 10 36 Z"}
            fill={`url(#${woodD})`}
          />
          {/* شريط ذهبي على الغطاء */}
          <path d="M30 13.6 Q36 12.6 42 13.6 L42 37 Q36 38.6 30 37 Z" fill={`url(#${gold})`} />
          {/* حواف ذهبية للغطاء */}
          <path d="M10 30 Q10 13 36 13 Q62 13 62 30 L62 32 Q36 37 10 32 Z" fill="none" stroke={`url(#${gold})`} strokeWidth="1.6" opacity="0.85" />
        </g>

        {/* جسم الصندوق */}
        <rect x="10" y="35" width="52" height="24" rx="4" fill={`url(#${wood})`} />
        {/* فواصل الخشب */}
        <line x1="24" y1="36" x2="24" y2="58" stroke="#3a2110" strokeWidth="1.4" opacity="0.7" />
        <line x1="48" y1="36" x2="48" y2="58" stroke="#3a2110" strokeWidth="1.4" opacity="0.7" />
        {/* شريط ذهبي عمودي */}
        <rect x="30" y="35" width="12" height="24" fill={`url(#${gold})`} />
        {/* قاعدة ذهبية */}
        <rect x="10" y="56" width="52" height="3" rx="1.5" fill={`url(#${gold})`} opacity="0.9" />

        {/* القفل */}
        <g>
          <rect x="28.5" y="40" width="15" height="11" rx="2.5" fill={`url(#${gold})`} stroke="#6e5313" strokeWidth="0.8" />
          <path d="M32 42 v-2.4 a4 4 0 0 1 8 0 v2.4" fill="none" stroke="#6e5313" strokeWidth="2" />
          <circle cx="36" cy="45" r="1.6" fill="#3a2110" />
        </g>
      </g>

      {/* لمعان ✨ للجاهز */}
      {ready && (
        <g className="animate-pulse">
          <path d="M12 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#ffe9a0" />
          <path d="M60 6 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z" fill="#f6d365" />
        </g>
      )}
    </svg>
  );
}

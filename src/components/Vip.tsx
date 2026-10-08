import { useEffect } from "react";

export const FRAMES: Record<string, { ring: string; top?: string; anim?: string }> = {
  king: { ring: "frame-king", top: "👑", anim: "frame-spin" },
  lion: { ring: "frame-lion", top: "🦁", anim: "frame-spin" },
  ghazal: { ring: "frame-ghazal", top: "🦌" },
  crown: { ring: "frame-gold", top: "👑" },
  diamond: { ring: "frame-diamond", top: "💎", anim: "frame-spin" },
  fire: { ring: "frame-fire", top: "🔥", anim: "frame-spin" },
};

export const ENTRIES: Record<string, { emoji: string; label: string }> = {
  royal: { emoji: "👑", label: "دخول ملكي" },
  horse: { emoji: "🐎", label: "على الخيل العربي" },
  falcon: { emoji: "🦅", label: "مع الصقر" },
  car: { emoji: "🏎️", label: "بالسيارة الفاخرة" },
  jet: { emoji: "✈️", label: "بالطائرة الذهبية" },
  dragon: { emoji: "🐉", label: "على التنين الذهبي" },
};

export function FramedAvatar({
  src, frame, size = 56, children, className = "",
}: { src?: string | null; frame?: string | null; size?: number; children?: React.ReactNode; className?: string }) {
  const f = frame ? FRAMES[frame] : undefined;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {f && <div className={`absolute -inset-[3px] rounded-full ${f.ring} ${f.anim ?? ""}`} />}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border border-border bg-secondary" style={{ fontSize: size / 2.6 }}>
        {children ?? (src ? <img src={src} alt="" className="h-full w-full object-cover" /> : "👤")}
      </div>
      {f?.top && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 drop-shadow" style={{ top: -size * 0.32, fontSize: size * 0.36 }}>
          {f.top}
        </span>
      )}
    </div>
  );
}

export function VipBadge({ level }: { level?: number | null }) {
  if (!level) return null;
  return (
    <span className="vip-badge mx-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] align-middle text-[9px] font-black">
      👑 VIP{level}
    </span>
  );
}

export function EntryOverlay({ entry, name, onDone }: { entry: string; name: string; onDone: () => void }) {
  const e = ENTRIES[entry] ?? ENTRIES.royal;
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <div className="entry-slide vip-card flex items-center gap-3 rounded-full px-5 py-3">
        <span className="text-4xl">{e.emoji}</span>
        <div>
          <p className="gold-text text-sm font-black">{name}</p>
          <p className="text-[11px] text-muted-foreground">دخل الغرفة {e.label} ✨</p>
        </div>
      </div>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, MessageCircle, Newspaper, User } from "lucide-react";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/feed", label: "المجتمع", icon: Newspaper },
  { to: "/families", label: "القروبات", icon: Users },
  { to: "/messages", label: "الرسائل", icon: MessageCircle },
  { to: "/me", label: "حسابي", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" : ""}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-24">
      {title ? (
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
          <h1 className="gold-text text-lg font-black">{title}</h1>
        </header>
      ) : null}
      {children}
      <BottomNav />
    </div>
  );
}

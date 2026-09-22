import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "الدخول إلى ديوانية المملكة" },
      { name: "description", content: "سجّل دخولك أو أنشئ حسابك للانضمام إلى الغرف الصوتية." },
      { property: "og:title", content: "الدخول إلى ديوانية المملكة" },
      { property: "og:description", content: "سجّل دخولك للانضمام إلى الغرف الصوتية والهدايا." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username || "عضو جديد" },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تحقق من بريدك لتأكيد الحساب.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error("تعذّر الدخول عبر جوجل");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-card text-4xl gold-ring">
          🦅
        </div>
        <h1 className="gold-text text-2xl font-black">ديوانية المملكة</h1>
        <p className="mt-1 text-xs text-muted-foreground">غرف صوتية • هدايا • قروبات</p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-5">
        {mode === "signup" && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسمك المستعار"
            className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {mode === "login" ? "دخول" : "إنشاء حساب"}
        </button>
        <button
          type="button"
          onClick={google}
          className="w-full rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold"
        >
          الدخول بحساب جوجل
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full pt-1 text-xs font-bold text-primary"
        >
          {mode === "login" ? "ما عندك حساب؟ سجّل الآن" : "عندك حساب؟ سجّل دخولك"}
        </button>
      </form>
    </main>
  );
}

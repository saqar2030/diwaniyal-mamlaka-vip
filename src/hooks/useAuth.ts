import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // نبضة الحضور: تحديث "متصل الآن"
  useEffect(() => {
    if (!session?.user) return;
    const ping = () => { void supabase.rpc("touch_presence"); };
    ping();
    const t = setInterval(ping, 60_000);
    return () => clearInterval(t);
  }, [session?.user?.id]);

  return { session, user: (session?.user ?? null) as User | null, loading };
}

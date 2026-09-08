import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_id: string;
  bio: string | null;
  avatar_url: string | null;
  age: number | null;
  coins: number;
  gifts_received: number;
  gifts_sent: number;
  level: number;
  name_color: string | null;
  last_seen_at?: string | null;
  is_banned?: boolean;
};

export async function fetchProfile(id: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("*, profiles:owner_id(username, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTopSupporters() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, gifts_received, gifts_sent")
    .order("gifts_received", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/** أفضل 3 داعمين لعضو معيّن */
export async function fetchTopSupportersOf(userId: string) {
  const { data, error } = await supabase
    .from("gift_events")
    .select("sender_id, amount")
    .eq("receiver_id", userId)
    .limit(2000);
  if (error) throw error;
  const totals = new Map<string, number>();
  (data ?? []).forEach((g) => totals.set(g.sender_id, (totals.get(g.sender_id) ?? 0) + Number(g.amount)));
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length === 0) return [] as { id: string; username: string; avatar_url: string | null; amount: number }[];
  const { data: ps } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", top.map((t) => t[0]));
  return top.map(([id, amount]) => {
    const p = (ps ?? []).find((x) => x.id === id);
    return { id, amount, username: p?.username ?? "عضو", avatar_url: p?.avatar_url ?? null };
  });
}

export function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

export function initials(name?: string | null) {
  return (name ?? "؟").trim().slice(0, 2);
}

export function formatCoins(n: number) {
  return new Intl.NumberFormat("ar-SA").format(Number(n ?? 0));
}

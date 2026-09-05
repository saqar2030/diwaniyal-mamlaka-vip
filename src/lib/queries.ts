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

export function initials(name?: string | null) {
  return (name ?? "؟").trim().slice(0, 2);
}

export function formatCoins(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n ?? 0);
}

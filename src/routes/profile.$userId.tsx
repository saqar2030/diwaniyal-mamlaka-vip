import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, formatCoins } from "@/lib/queries";
import { MessageCircle, UserPlus, UserMinus } from "lucide-react";

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({
    meta: [
      { title: "ملف عضو | ديوانية المملكة" },
      { name: "description", content: "استعرض ملف العضو، الدعم المستلم، والمتابعين في ديوانية المملكة." },
      { property: "og:title", content: "ملف عضو في ديوانية المملكة" },
      { property: "og:description", content: "استعرض ملف العضو والدعم والمتابعين." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const profile = useQuery({ queryKey: ["profile", userId], queryFn: () => fetchProfile(userId) });

  const follows = useQuery({
    queryKey: ["follows", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
      if (error) throw error;
      return data ?? [];
    },
  });

  const followers = (follows.data ?? []).filter((f) => f.following_id === userId);
  const following = (follows.data ?? []).filter((f) => f.follower_id === userId);
  const isFollowing = followers.some((f) => f.follower_id === user?.id);

  async function toggleFollow() {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (user.id === userId) return;
    if (isFollowing)
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    else await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    qc.invalidateQueries({ queryKey: ["follows", userId] });
  }

  const p = profile.data;

  return (
    <AppShell title="الملف الشخصي">
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-3xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl gold-ring">
            {p?.avatar_url ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" /> : "👤"}
          </div>
          <h1 className="text-base font-black text-primary">{p?.username ?? "عضو"}</h1>
          <p className="text-[10px] text-muted-foreground">ID: {p?.display_id}</p>
          {p?.bio ? <p className="mt-2 text-xs text-muted-foreground">{p.bio}</p> : null}

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">المتابعون</p>
              <p className="font-black">{followers.length}</p>
            </div>
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">يتابع</p>
              <p className="font-black">{following.length}</p>
            </div>
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-muted-foreground">الدعم المستلم</p>
              <p className="font-black text-primary">{formatCoins(p?.gifts_received ?? 0)}</p>
            </div>
          </div>

          {user?.id !== userId && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={toggleFollow}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-black ${
                  isFollowing ? "bg-secondary" : "bg-primary text-primary-foreground"
                }`}
              >
                {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isFollowing ? "إلغاء المتابعة" : "متابعة"}
              </button>
              <button
                onClick={() => navigate({ to: "/messages" })}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-black"
              >
                <MessageCircle className="h-4 w-4" /> رسالة
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

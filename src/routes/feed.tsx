import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, MessageSquare } from "lucide-react";
import ChatGames from "../../components/ChatGames";


export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "مجتمع ديوانية المملكة" },
      { name: "description", content: "شارك منشوراتك وتفاعل مع أعضاء ديوانية المملكة." },
      { property: "og:title", content: "مجتمع ديوانية المملكة" },
      { property: "og:description", content: "منشورات وتعليقات وإعجابات بين أعضاء الديوانية." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const posts = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:user_id(username, avatar_url), post_likes(user_id), post_comments(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function publish() {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (!content.trim()) return;
    const { error } = await supabase.from("posts").insert({ user_id: user.id, content: content.trim() });
    if (error) { toast.error(error.message); return; }
    setContent("");
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  async function toggleLike(postId: string, liked: boolean) {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (liked) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    else await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <AppShell title="المجتمع">
      <div className="space-y-3 px-4 py-4">
        <div className="rounded-2xl border border-border bg-card p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="وش يدور في بالك اليوم؟ ☕"
            className="h-20 w-full resize-none rounded-xl border border-border bg-input p-3 text-xs outline-none focus:border-primary"
          />
          <button onClick={publish} className="mt-2 w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
            نشر
          </button>
        </div>

        {(posts.data ?? []).map((p: any) => {
          const liked = (p.post_likes ?? []).some((l: any) => l.user_id === user?.id);
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-3">
              <Link to="/profile/$userId" params={{ userId: p.user_id }} className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs">
                  {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}
                </div>
                <span className="text-xs font-black text-primary">{p.profiles?.username ?? "عضو"}</span>
              </Link>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{p.content}</p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <button onClick={() => toggleLike(p.id, liked)} className={`flex items-center gap-1 ${liked ? "text-destructive" : ""}`}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {(p.post_likes ?? []).length}
                </button>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" /> {(p.post_comments ?? []).length}
                </span>
              </div>
            </article>
          );
        })}
        {!posts.isLoading && (posts.data ?? []).length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">لا توجد منشورات بعد.</p>
        )}
      </div>
   <ChatGames />

</AppShell>


  );
}

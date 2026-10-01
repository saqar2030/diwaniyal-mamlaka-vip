import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia, extOf } from "@/lib/upload";
import { Heart, MessageSquare, ImagePlus, X, Send } from "lucide-react";
import ChatGames from "@/components/ChatGames";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "مجتمع ديوانية المملكة" },
      { name: "description", content: "شارك منشوراتك وصورك وفيديوهاتك وتفاعل مع أعضاء ديوانية المملكة." },
      { property: "og:title", content: "مجتمع ديوانية المملكة" },
      { property: "og:description", content: "منشورات وصور وفيديوهات وتعليقات وإعجابات بين أعضاء الديوانية." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const posts = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:user_id(username, avatar_url), post_likes(user_id), post_comments(id)")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function publish() {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    if (!content.trim() && !file) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      let media_kind: string | null = null;
      if (file) {
        if (file.size > 50 * 1024 * 1024) { toast.error("الحد الأقصى للملف 50 ميجا"); return; }
        image_url = await uploadMedia(user.id, file, extOf(file));
        media_kind = file.type.startsWith("video/") ? "video" : "image";
      }
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: content.trim(), image_url, media_kind });
      if (error) throw error;
      setContent("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("تم النشر");
    } catch (e) {
      toast.error((e as Error).message || "تعذّر النشر");
    } finally {
      setBusy(false);
    }
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
          {file && (
            <div className="relative mt-2">
              {file.type.startsWith("video/") ? (
                <video src={URL.createObjectURL(file)} className="max-h-48 w-full rounded-xl" controls />
              ) : (
                <img src={URL.createObjectURL(file)} alt="" className="max-h-48 w-full rounded-xl object-cover" />
              )}
              <button onClick={() => setFile(null)} className="absolute left-2 top-2 rounded-full bg-background/80 p-1" aria-label="إزالة">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold">
              <ImagePlus className="h-4 w-4 text-primary" /> صورة / فيديو
            </button>
            <button onClick={publish} disabled={busy} className="flex-1 rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
              {busy ? "جاري النشر…" : "نشر"}
            </button>
          </div>
        </div>

        {(posts.data ?? []).map((p: any) => {
          const liked = (p.post_likes ?? []).some((l: any) => l.user_id === user?.id);
          return (
            <PostCard key={p.id} p={p} liked={liked} userId={user?.id} onLike={() => toggleLike(p.id, liked)} />
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

function PostCard({ p, liked, userId, onLike }: { p: any; liked: boolean; userId?: string | undefined; onLike: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const comments = useQuery({
    queryKey: ["comments", p.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, content, created_at, user_id, profiles:user_id(username, avatar_url)")
        .eq("post_id", p.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addComment() {
    if (!userId) { toast.error("سجّل دخولك أولاً"); return; }
    if (!text.trim()) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: p.id, user_id: userId, content: text.trim() });
    if (error) { toast.error(error.message); return; }
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", p.id] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-3">
      <Link to="/profile/$userId" params={{ userId: p.user_id }} className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs">
          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}
        </div>
        <span className="text-xs font-black text-primary">{p.profiles?.username ?? "عضو"}</span>
      </Link>
      {p.content && <p className="whitespace-pre-wrap text-xs leading-relaxed">{p.content}</p>}
      {p.image_url &&
        (p.media_kind === "video" ? (
          <video src={p.image_url} controls playsInline preload="metadata" className="mt-2 max-h-80 w-full rounded-xl" />
        ) : (
          <img src={p.image_url} alt="" loading="lazy" className="mt-2 max-h-80 w-full rounded-xl object-cover" />
        ))}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <button onClick={onLike} className={`flex items-center gap-1 ${liked ? "text-destructive" : ""}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {(p.post_likes ?? []).length}
        </button>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" /> {(p.post_comments ?? []).length} تعليق
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {(comments.data ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl bg-secondary px-3 py-2 text-[11px]">
              <span className="font-black text-primary">{c.profiles?.username ?? "عضو"}: </span>
              {c.content}
            </div>
          ))}
          {comments.isLoading && <p className="text-[10px] text-muted-foreground">جاري التحميل…</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder="اكتب تعليقك…"
              className="flex-1 rounded-full border border-border bg-input px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button onClick={addComment} className="rounded-full bg-primary p-2 text-primary-foreground" aria-label="إرسال التعليق">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

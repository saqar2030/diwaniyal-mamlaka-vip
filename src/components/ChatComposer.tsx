import { useRef, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Mic, Send, Square } from "lucide-react";
import { uploadMedia, extOf } from "@/lib/upload";

export type OutgoingMessage = { kind: "text" | "image" | "audio" | "video"; content: string; media_url: string | null };

export function ChatComposer({
  userId,
  onSend,
  placeholder = "اكتب رسالتك…",
  extra,
}: {
  userId?: string | undefined;
  onSend: (m: OutgoingMessage) => void | Promise<void>;
  placeholder?: string | undefined;
  extra?: React.ReactNode | undefined;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // النقاط واللفل تُحتسب تلقائياً في السيرفر مع كل رسالة
  async function updateUserXP(_pointsToAdd: number) {}

  // دالة تشغيل بوت ألعاب المسابقات التفاعلي داخل الشات
  function handleQuizBot(messageText: string) {
    const cleanText = messageText.trim();
    
    // تفعيل اللعبة عند كتابة "العب"
    if (cleanText === "العب") {
      setTimeout(async () => {
        await onSend({
          kind: "text",
          content: "🤖 بوت ديوانية المملكة: كفو! دخلنا وضع التحدي 🎮. ما هي عاصمة المملكة العربية السعودية؟ (الرياض / جدة / مكة)",
          media_url: null
        });
      }, 600);
      return true;
    }

    // التحقق من الإجابة الصحيحة للعبة
    if (cleanText === "الرياض") {
      setTimeout(async () => {
        await onSend({
          kind: "text",
          content: "🎉 إجابة صحيحة! حصلت على 50 نقطة XP إضافية لرفع لفل حسابك!",
          media_url: null
        });
        await updateUserXP(50); // منح 50 نقطة كجائزة مجانية
      }, 600);
      return true;
    }
    return false;
  }

  async function sendText() {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");

    // تشغيل بوت الألعاب أولاً، إذا لم تكن رسالة لعبة يتم إرسالها كشات عادي
    const isBotTriggered = handleQuizBot(content);
    
    await onSend({ kind: "text", content, media_url: null });
    
    if (!isBotTriggered) {
      await updateUserXP(10); // زيادة 10 نقاط XP مجاناً مع كل سالفة
    }
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setBusy(true);
    try {
      if (file.size > 50 * 1024 * 1024) { toast.error("الحد الأقصى للملف 50 ميجا"); return; }
      const isVideo = file.type.startsWith("video/");
      const url = await uploadMedia(userId, file, extOf(file));
      await onSend({ kind: isVideo ? "video" : "image", content: "", media_url: url });
      await updateUserXP(10); // زيادة النقاط عند إرسال صورة
    } catch (err) {
      toast.error("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (!userId) return;
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size < 800) return;
          const url = await uploadMedia(userId, blob, "webm");
          await onSend({ kind: "audio", content: "", media_url: url });
          await updateUserXP(10); // زيادة النقاط عند إرسال رسالة صوتية
        } catch {
          toast.error("تعذّر إرسال الرسالة الصوتية");
        } finally {
          setBusy(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("لم نتمكن من الوصول للمايك");
    }
  }

  // التصميم الفخم والألوان والأزرار الأصلية تم الحفاظ عليها 100% بدون أي تغيير بصري
  return (
    <div className="flex items-center gap-2">
      {extra}
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickImage} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="rounded-full bg-secondary p-2.5 disabled:opacity-50"
        aria-label="إرسال صورة أو فيديو"
      >
        <ImageIcon className="h-4 w-4 text-primary" />
      </button>
      <button
        onClick={toggleRecord}
        disabled={busy}
        className={`rounded-full p-2.5 disabled:opacity-50 ${recording ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}
        aria-label="رسالة صوتية"
      >
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4 text-primary" />}
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendText()}
        placeholder={recording ? "جاري التسجيل…" : placeholder}
        className="flex-1 rounded-full border border-border bg-input px-4 py-2 text-xs outline-none focus:border-primary"
      />
      <button onClick={sendText} className="rounded-full bg-primary p-2.5 text-primary-foreground" aria-label="إرسال">
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MessageBody({ kind, content, mediaUrl }: { kind?: string | null; content: string; mediaUrl?: string | null }) {
  if (kind === "image" && mediaUrl)
    return <img src={mediaUrl} alt="صورة" className="max-h-56 rounded-xl object-cover" loading="lazy" />;
  if (kind === "video" && mediaUrl)
    return <video controls playsInline src={mediaUrl} className="max-h-64 w-56 rounded-xl" preload="metadata" />;
  if (kind === "audio" && mediaUrl) return <audio controls src={mediaUrl} className="h-9 w-52" />;
  return <span>{content}</span>;
}

import { supabase } from "@/integrations/supabase/client";

const YEAR = 60 * 60 * 24 * 365;

export async function uploadMedia(userId: string, file: Blob, ext: string) {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, file.type ? { contentType: file.type, upsert: false } : { upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from("media").createSignedUrl(path, YEAR);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export function extOf(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

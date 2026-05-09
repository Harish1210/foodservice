import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role — bypasses RLS for uploads
const supabase = createClient(supabaseUrl, serviceKey);

const BUCKET = "menu-images";

/** Ensure the storage bucket exists (creates it as public if missing). */
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 */
export async function uploadImage(file: File): Promise<string> {
  await ensureBucket();

  const ext      = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes    = await file.arrayBuffer();
  const buffer   = Buffer.from(bytes);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage given its full public URL.
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    const filename = url.split(`${BUCKET}/`)[1];
    if (!filename) return;
    await supabase.storage.from(BUCKET).remove([filename]);
  } catch {
    console.warn("Failed to delete image from storage:", url);
  }
}

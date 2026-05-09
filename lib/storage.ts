import { createClient } from "@supabase/supabase-js";

const BUCKET = "menu-images";

/** Lazily create the Supabase client so env vars are always available at call time. */
function getClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(`Supabase env vars missing: URL=${!!supabaseUrl} KEY=${!!serviceKey}`);
  }
  return createClient(supabaseUrl, serviceKey);
}

/** Ensure the storage bucket exists (creates it as public if missing). */
async function ensureBucket() {
  const supabase = getClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    // Ignore "already exists" errors — bucket may have been created concurrently
    if (createErr && !createErr.message.includes("already exists")) {
      throw new Error(`createBucket failed: ${createErr.message}`);
    }
  }
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 */
export async function uploadImage(file: File): Promise<string> {
  await ensureBucket();

  const supabase = getClient();
  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes    = await file.arrayBuffer();
  const buffer   = Buffer.from(bytes);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage given its full public URL.
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    const supabase = getClient();
    const filename = url.split(`${BUCKET}/`)[1];
    if (!filename) return;
    await supabase.storage.from(BUCKET).remove([filename]);
  } catch {
    console.warn("Failed to delete image from storage:", url);
  }
}

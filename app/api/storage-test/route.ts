import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase env vars missing", urlPresent: !!url, keyPresent: !!key });
  }

  // Strip BOM characters that can sneak into env vars via copy-paste
  const stripBom = (s: string) => s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  const supabase = createClient(stripBom(url), stripBom(key));
  const results: Record<string, unknown> = {
    supabaseUrl: url.substring(0, 50) + "...",
    urlPresent: true,
    keyPresent: true,
  };

  // 1. List buckets
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  results.buckets = buckets?.map((b) => ({ name: b.name, public: b.public })) ?? null;
  results.listError = listErr?.message ?? null;

  // 2. Try creating the bucket (idempotent)
  const { data: created, error: createErr } = await supabase.storage.createBucket("menu-images", { public: true });
  results.createBucketResult = created ?? null;
  results.createBucketError = createErr?.message ?? null;

  // 3. Upload a tiny test file
  const testContent = Buffer.from("hello storage test");
  const testFilename = `test-${Date.now()}.txt`;
  const { data: uploaded, error: uploadErr } = await supabase.storage
    .from("menu-images")
    .upload(testFilename, testContent, { contentType: "text/plain", upsert: true });
  results.uploadResult = uploaded ?? null;
  results.uploadError = uploadErr?.message ?? null;

  // 4. Get public URL
  const { data: publicUrlData } = supabase.storage.from("menu-images").getPublicUrl(testFilename);
  results.publicUrl = publicUrlData?.publicUrl ?? null;

  // 5. Try fetching that public URL to confirm it's actually public
  if (publicUrlData?.publicUrl) {
    try {
      const fetchRes = await fetch(publicUrlData.publicUrl);
      results.publicUrlFetchStatus = fetchRes.status;
      results.publicUrlFetchOk = fetchRes.ok;
    } catch (e) {
      results.publicUrlFetchError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(results);
}

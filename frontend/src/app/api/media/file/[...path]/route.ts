import { createServerSupabaseClient } from "@/lib/supabase/server";

// The media bucket is private: storage RLS decides who sees what
// (public = published + consent approved + not hidden; staff = everything).
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const storagePath = path.join("/");

  if (!storagePath.startsWith("derivatives/") || path.some((part) => part === ".." || part === "")) {
    return Response.json({ error: "not_found", message: "Foto tidak ditemukan." }, { status: 404 });
  }

  const client = await createServerSupabaseClient();
  const { data, error } = await client.storage.from("media").download(storagePath);

  if (error || !data) {
    return Response.json({ error: "not_found", message: "Foto tidak ditemukan." }, { status: 404 });
  }

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": data.type || "image/jpeg",
      // shortcut: browser-only cache, so a hidden photo can linger up to 5 min per viewer; move to CDN + purge if egress grows
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

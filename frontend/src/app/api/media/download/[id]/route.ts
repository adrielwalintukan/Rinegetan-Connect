import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMediaAssetDownloadEligible } from "@/lib/media/eligibility";
import { checkDownloadRateLimit } from "@/lib/media/rate-limiter";
import { recordDownloadAudit, hashIp } from "@/lib/media/download-audit";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // 1. Rate Limit
  const rateLimit = checkDownloadRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        message: "Batas permintaan unduhan tercapai. Silakan coba lagi dalam beberapa saat.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
        },
      }
    );
  }

  // 2. Query Asset
  const client = getSupabaseClient();
  const { data: asset, error: assetError } = await client
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .single();

  if (assetError || !asset) {
    return NextResponse.json(
      { error: "not_found", message: "Foto tidak ditemukan." },
      { status: 404 }
    );
  }

  // 3. Eligibility Check
  if (!isMediaAssetDownloadEligible(asset)) {
    return NextResponse.json(
      {
        error: "download_forbidden",
        message: "Foto ini tidak diizinkan untuk diunduh publik.",
      },
      { status: 403 }
    );
  }

  // 4. Download file from Supabase storage (only derivative)
  const { data: fileBlob, error: storageError } = await client.storage
    .from("media")
    .download(asset.storage_path);

  if (storageError || !fileBlob) {
    return NextResponse.json(
      { error: "storage_error", message: "Gagal mengambil file media." },
      { status: 500 }
    );
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 5. Asynchronously record audit log
  recordDownloadAudit({
    action: "media.download_asset",
    entityType: "media_asset",
    entityId: asset.id,
    changes: {
      ip_hash: hashIp(ip),
      user_agent: request.headers.get("user-agent") || "unknown",
      file_count: 1,
      total_bytes: buffer.length,
      storage_path: asset.storage_path,
    },
  }).catch(() => {});

  const cleanFilename = `rinegetan-${asset.id.slice(0, 8)}.jpg`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${cleanFilename}"`,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "private, no-transform, max-age=3600",
    },
  });
}

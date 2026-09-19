import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isMediaAssetDownloadEligible,
  isMediaAlbumDownloadEligible,
} from "@/lib/media/eligibility";
import { checkDownloadRateLimit } from "@/lib/media/rate-limiter";
import { recordDownloadAudit, hashIp } from "@/lib/media/download-audit";
import { createArchiveStream, ArchiveFileEntry } from "@/lib/media/archive-stream";
import type { MediaAsset } from "@/types/media";

const MAX_ALBUM_DOWNLOAD_FILES = 35;
const MAX_ALBUM_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

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
        headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() },
      }
    );
  }

  const client = getSupabaseClient();

  // 2. Fetch Album
  const { data: album, error: albumError } = await client
    .from("media_albums")
    .select("*, album_assets(position, asset:asset_id(*))")
    .eq("id", id)
    .single();

  if (albumError || !album) {
    return NextResponse.json(
      { error: "not_found", message: "Album tidak ditemukan." },
      { status: 404 }
    );
  }

  if (!isMediaAlbumDownloadEligible(album)) {
    return NextResponse.json(
      {
        error: "download_forbidden",
        message: "Unduhan untuk album ini dinonaktifkan.",
      },
      { status: 403 }
    );
  }

  // 3. Filter Eligible Assets
  const albumAssets = (album.album_assets || [])
    .map((aa: { position: number; asset: MediaAsset }) => aa.asset)
    .filter((asset: MediaAsset) => isMediaAssetDownloadEligible(asset))
    .slice(0, MAX_ALBUM_DOWNLOAD_FILES);

  if (albumAssets.length === 0) {
    return NextResponse.json(
      {
        error: "no_downloadable_assets",
        message: "Tidak ada foto dalam album ini yang diizinkan untuk diunduh.",
      },
      { status: 404 }
    );
  }

  // 4. Fetch derivative images from Storage
  const entries: ArchiveFileEntry[] = [];
  let totalBytes = 0;

  for (let i = 0; i < albumAssets.length; i++) {
    const asset = albumAssets[i];
    if (totalBytes + (asset.bytes || 0) > MAX_ALBUM_DOWNLOAD_BYTES && entries.length > 0) {
      break;
    }

    const { data: blob } = await client.storage
      .from("media")
      .download(asset.storage_path);

    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      totalBytes += buffer.length;
      const indexStr = String(i + 1).padStart(2, "0");
      entries.push({
        name: `${indexStr}-rinegetan-${asset.id.slice(0, 8)}.jpg`,
        buffer,
      });
    }
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "storage_error", message: "Gagal mengambil file foto untuk arsip." },
      { status: 500 }
    );
  }

  const readme = [
    `Arsip Dokumentasi GMAHK Jemaat Rinegetan`,
    `Album: ${album.title}`,
    `Tanggal: ${album.occurred_on}`,
    `Jumlah Foto: ${entries.length}`,
    `Diunduh pada: ${new Date().toISOString()}`,
    ``,
    `Foto ini diterbitkan untuk jemaat dan keluarga GMAHK Rinegetan.`,
  ].join("\n");

  const { stream } = createArchiveStream(entries, readme);

  // 5. Audit Log
  recordDownloadAudit({
    action: "media.download_album",
    entityType: "media_album",
    entityId: album.id,
    changes: {
      ip_hash: hashIp(ip),
      user_agent: request.headers.get("user-agent") || "unknown",
      file_count: entries.length,
      total_bytes: totalBytes,
      album_slug: album.slug,
    },
  }).catch(() => {});

  const filename = `rinegetan-album-${album.slug || album.id.slice(0, 8)}.zip`;

  // Convert Node Readable to Web ReadableStream for Response
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-transform, max-age=3600",
    },
  });
}

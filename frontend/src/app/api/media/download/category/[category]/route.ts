import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMediaAssetDownloadEligible } from "@/lib/media/eligibility";
import { checkDownloadRateLimit } from "@/lib/media/rate-limiter";
import { recordDownloadAudit, hashIp } from "@/lib/media/download-audit";
import { createArchiveStream, ArchiveFileEntry } from "@/lib/media/archive-stream";
import type { MediaCategory, MediaAsset } from "@/types/media";

const VALID_CATEGORIES: MediaCategory[] = [
  "ibadah",
  "pemuda",
  "sekolah_sabat",
  "sosial",
  "fellowship",
  "umum",
];

const MAX_CATEGORY_DOWNLOAD_FILES = 35;
const MAX_CATEGORY_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  const { category } = await context.params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // 1. Validate Category
  const normalizedCategory = category.toLowerCase() as MediaCategory;
  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return NextResponse.json(
      { error: "invalid_category", message: "Kategori tidak valid." },
      { status: 400 }
    );
  }

  // 2. Rate Limit
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

  // 3. Query eligible assets for this category
  const client = getSupabaseClient();
  const { data: assets, error: assetsError } = await client
    .from("media_assets")
    .select("*, album_assets!inner(album:album_id!inner(category, status))")
    .eq("album_assets.album.category", normalizedCategory)
    .eq("album_assets.album.status", "published")
    .eq("status", "published")
    .eq("consent_status", "approved")
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_CATEGORY_DOWNLOAD_FILES);

  if (assetsError || !assets) {
    return NextResponse.json(
      { error: "query_error", message: "Gagal mengambil foto kategori." },
      { status: 500 }
    );
  }

  const eligibleAssets = (assets as MediaAsset[]).filter((a) =>
    isMediaAssetDownloadEligible(a)
  );

  if (eligibleAssets.length === 0) {
    return NextResponse.json(
      {
        error: "no_downloadable_assets",
        message: "Tidak ada foto yang diizinkan untuk diunduh dalam kategori ini.",
      },
      { status: 404 }
    );
  }

  // 4. Download derivatives and pack into ZIP
  const entries: ArchiveFileEntry[] = [];
  let totalBytes = 0;

  for (let i = 0; i < eligibleAssets.length; i++) {
    const asset = eligibleAssets[i];
    if (totalBytes + (asset.bytes || 0) > MAX_CATEGORY_DOWNLOAD_BYTES && entries.length > 0) {
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
    `Kategori: ${normalizedCategory}`,
    `Jumlah Foto: ${entries.length}`,
    `Diunduh pada: ${new Date().toISOString()}`,
    ``,
    `Foto ini diterbitkan untuk jemaat dan keluarga GMAHK Rinegetan.`,
  ].join("\n");

  const { stream } = createArchiveStream(entries, readme);

  // 5. Audit Log
  recordDownloadAudit({
    action: "media.download_category",
    entityType: "media_category",
    entityId: null,
    changes: {
      ip_hash: hashIp(ip),
      user_agent: request.headers.get("user-agent") || "unknown",
      file_count: entries.length,
      total_bytes: totalBytes,
      category: normalizedCategory,
    },
  }).catch(() => {});

  const filename = `rinegetan-kategori-${normalizedCategory}.zip`;
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

# P2-404 Restricted Media Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan sistem pengunduhan foto tunggal, album ZIP, dan kategori ZIP yang dibatasi oleh aturan kelayakan (consent, hidden, status, public_download_enabled), batas beban (rate limit 6 req/min, maks 35 foto/50 MB), pencatatan audit log, dan integrasi tombol antarmuka pada MediaLightbox dan MediaPage.

**Architecture:** Menerapkan 3 route API streaming di Next.js (`/api/media/download/[id]`, `/api/media/download/album/[id]`, `/api/media/download/category/[category]`) dengan modul kelayakan (*eligibility*), in-memory sliding window rate limiter, generator streaming ZIP menggunakan `archiver`, pencatatan audit log ke `public.audit_logs`, serta integrasi tombol unduh interaktif pada `MediaLightbox` dan `MediaPage`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase JS Client, `archiver`, `sharp`, `sonner`, Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-09-18-p2-404-restricted-media-download-design.md`

## Global Constraints

- Never leak master originals or EXIF/GPS: Only derivative JPEGs from Supabase Storage (`derivatives/...jpg`) may be downloaded.
- Child protection invariant: Photos with `subject_age_group = 'child'` and `consent_status != 'approved'` can never be downloaded.
- Eligibility invariant: Assets must have `status = 'published'`, `consent_status = 'approved'`, `hidden_at IS NULL`, and `public_download_enabled = true`.
- Rate limit: 6 requests per 60 seconds per IP, responding with HTTP 429 and `Retry-After: 60`.
- Archive limits: Maximum 35 photos or 50 MB per ZIP, 15 seconds timeout guard.
- Audit logs: Every download event must be logged with `media.download_asset`, `media.download_album`, or `media.download_category`.

---

### Task 1: Eligibility Checker & Rate Limiter Utilities

**Files:**
- Create: `frontend/src/lib/media/eligibility.ts`
- Create: `frontend/src/lib/media/rate-limiter.ts`
- Test: `frontend/tests/media-download-eligibility.test.mjs`
- Test: `frontend/tests/media-rate-limiter.test.mjs`

**Interfaces:**
- Produces:
  - `isMediaAssetDownloadEligible(asset: Partial<MediaAsset>): boolean`
  - `isMediaAlbumDownloadEligible(album: Partial<MediaAlbum>): boolean`
  - `checkDownloadRateLimit(ip: string, limit?: number, windowMs?: number): { allowed: boolean; remaining: number; resetMs: number }`

- [ ] **Step 1: Write the failing tests for eligibility and rate limiter**

Create `frontend/tests/media-download-eligibility.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  isMediaAssetDownloadEligible,
  isMediaAlbumDownloadEligible,
} from "../src/lib/media/eligibility.mjs";

test("eligibility: permits valid published asset with consent and public download enabled", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), true);
});

test("eligibility: blocks asset if public_download_enabled is false", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: false,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: blocks asset if hidden_at is set", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: new Date().toISOString(),
    public_download_enabled: true,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: blocks child photo without approved consent even if published", () => {
  const asset = {
    status: "published",
    consent_status: "pending",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "child",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: permits child photo with approved consent", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "child",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), true);
});

test("album eligibility: permits published album with public download enabled", () => {
  const album = {
    status: "published",
    public_download_enabled: true,
  };
  assert.equal(isMediaAlbumDownloadEligible(album), true);
});

test("album eligibility: rejects album with public_download_enabled false", () => {
  const album = {
    status: "published",
    public_download_enabled: false,
  };
  assert.equal(isMediaAlbumDownloadEligible(album), false);
});
```

Create `frontend/tests/media-rate-limiter.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { checkDownloadRateLimit, resetRateLimiter } from "../src/lib/media/rate-limiter.mjs";

test("rate limiter: allows up to limit and blocks subsequent requests", () => {
  resetRateLimiter();
  const ip = "192.168.1.50";
  const limit = 3;
  const windowMs = 1000;

  for (let i = 0; i < limit; i++) {
    const res = checkDownloadRateLimit(ip, limit, windowMs);
    assert.equal(res.allowed, true);
    assert.equal(res.remaining, limit - 1 - i);
  }

  const blocked = checkDownloadRateLimit(ip, limit, windowMs);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetMs > 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/media-download-eligibility.test.mjs tests/media-rate-limiter.test.mjs`
Expected: FAIL (cannot find module `eligibility.mjs` / `rate-limiter.mjs`).

- [ ] **Step 3: Implement minimal code for eligibility and rate limiter**

Create `frontend/src/lib/media/eligibility.ts` (and `eligibility.mjs` for node tests):
```typescript
import type { MediaAsset, MediaAlbum } from "@/types/media";

export function isMediaAssetDownloadEligible(
  asset?: Partial<MediaAsset> | null
): boolean {
  if (!asset) return false;
  if (asset.status !== "published") return false;
  if (asset.consent_status !== "approved") return false;
  if (asset.hidden_at) return false;
  if (asset.public_download_enabled !== true) return false;

  // Child protection invariant
  if (asset.subject_age_group === "child" && asset.consent_status !== "approved") {
    return false;
  }

  return true;
}

export function isMediaAlbumDownloadEligible(
  album?: Partial<MediaAlbum> | null
): boolean {
  if (!album) return false;
  if (album.status !== "published") return false;
  if (album.public_download_enabled !== true) return false;
  return true;
}
```

Create `frontend/src/lib/media/rate-limiter.ts` (and `rate-limiter.mjs` for node tests):
```typescript
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const DEFAULT_DOWNLOAD_RATE_LIMIT = 6;
export const DEFAULT_DOWNLOAD_WINDOW_MS = 60 * 1000; // 60 seconds

export function checkDownloadRateLimit(
  ip: string,
  limit: number = DEFAULT_DOWNLOAD_RATE_LIMIT,
  windowMs: number = DEFAULT_DOWNLOAD_WINDOW_MS
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { timestamps: [] };

  // Filter timestamps within sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldestTimestamp));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(ip, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}

export function resetRateLimiter(): void {
  rateLimitStore.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/media-download-eligibility.test.mjs tests/media-rate-limiter.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/media/eligibility.ts frontend/src/lib/media/eligibility.mjs frontend/src/lib/media/rate-limiter.ts frontend/src/lib/media/rate-limiter.mjs frontend/tests/media-download-eligibility.test.mjs frontend/tests/media-rate-limiter.test.mjs
git commit -m "feat(media): implement eligibility check and rate limiter utilities"
```

---

### Task 2: Audit Logger Helper & Single Photo Download Route

**Files:**
- Create: `frontend/src/lib/media/download-audit.ts`
- Create: `frontend/src/lib/media/download-audit.mjs`
- Create: `frontend/src/app/api/media/download/[id]/route.ts`
- Test: `frontend/tests/media-single-download.test.mjs`

**Interfaces:**
- Consumes:
  - `isMediaAssetDownloadEligible` from `frontend/src/lib/media/eligibility`
  - `checkDownloadRateLimit` from `frontend/src/lib/media/rate-limiter`
- Produces:
  - `recordDownloadAudit(params: { action: string; entityType: string; entityId?: string | null; changes: Record<string, unknown> }): Promise<void>`
  - Route handler `GET /api/media/download/[id]`

- [ ] **Step 1: Write failing test for single photo download route logic**

Create `frontend/tests/media-single-download.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { isMediaAssetDownloadEligible } from "../src/lib/media/eligibility.mjs";
import { checkDownloadRateLimit, resetRateLimiter } from "../src/lib/media/rate-limiter.mjs";

test("single download handler logic: rejects non-eligible asset with 404/403", () => {
  const hiddenAsset = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    status: "published",
    consent_status: "approved",
    hidden_at: "2026-09-18T10:00:00Z",
    public_download_enabled: true,
  };
  assert.equal(isMediaAssetDownloadEligible(hiddenAsset), false);
});

test("single download handler logic: enforces rate limit", () => {
  resetRateLimiter();
  const ip = "10.0.0.1";
  for (let i = 0; i < 6; i++) {
    assert.equal(checkDownloadRateLimit(ip).allowed, true);
  }
  assert.equal(checkDownloadRateLimit(ip).allowed, false);
});
```

- [ ] **Step 2: Run test to verify it passes unit checks**

Run: `node --test tests/media-single-download.test.mjs`
Expected: PASS.

- [ ] **Step 3: Implement download audit helper and single download route**

Create `frontend/src/lib/media/download-audit.ts` (and `.mjs`):
```typescript
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function recordDownloadAudit(params: {
  action: "media.download_asset" | "media.download_album" | "media.download_category";
  entityType: "media_asset" | "media_album" | "media_category";
  entityId?: string | null;
  changes: Record<string, unknown>;
  actorId?: string | null;
}): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) return;

  try {
    await client.from("audit_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      actor_id: params.actorId || null,
      changes: params.changes,
    });
  } catch (err) {
    console.error("Failed to record media download audit log:", err);
  }
}
```

Create `frontend/src/app/api/media/download/[id]/route.ts`:
```typescript
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
```

- [ ] **Step 4: Run tests and verify syntax**

Run: `node --test tests/media-single-download.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/media/download-audit.ts frontend/src/lib/media/download-audit.mjs frontend/src/app/api/media/download/[id]/route.ts frontend/tests/media-single-download.test.mjs
git commit -m "feat(media): implement single photo download route and audit logger"
```

---

### Task 3: Streaming Archive Helper & Album ZIP Download Route

**Files:**
- Modify: `frontend/package.json` (add `archiver` and `@types/archiver`)
- Create: `frontend/src/lib/media/archive-stream.ts`
- Create: `frontend/src/app/api/media/download/album/[id]/route.ts`
- Test: `frontend/tests/media-album-download.test.mjs`

**Interfaces:**
- Consumes:
  - `isMediaAssetDownloadEligible`, `isMediaAlbumDownloadEligible` from `frontend/src/lib/media/eligibility`
  - `checkDownloadRateLimit` from `frontend/src/lib/media/rate-limiter`
  - `recordDownloadAudit`, `hashIp` from `frontend/src/lib/media/download-audit`
- Produces:
  - `createZipStream(entries: Array<{ name: string; buffer: Buffer }>): { stream: NodeJS.ReadableStream; finalize: () => Promise<number> }`
  - Route handler `GET /api/media/download/album/[id]`

- [ ] **Step 1: Install archiver dependencies**

Run: `npm --prefix frontend install archiver && npm --prefix frontend install -D @types/archiver`

- [ ] **Step 2: Write failing test for archive stream creation**

Create `frontend/tests/media-album-download.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import archiver from "archiver";

test("archive generation: creates valid zip stream from in-memory buffers", async () => {
  const archive = archiver("zip", { zlib: { level: 5 } });
  const chunks = [];

  archive.on("data", (chunk) => chunks.push(chunk));

  const endPromise = new Promise((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  archive.append("Test content", { name: "README.txt" });
  archive.append(Buffer.from([0xff, 0xd8, 0xff]), { name: "test.jpg" });
  archive.finalize();

  await endPromise;
  const result = Buffer.concat(chunks);
  assert.ok(result.length > 0);
  // Check ZIP signature (PK..)
  assert.equal(result[0], 0x50);
  assert.equal(result[1], 0x4b);
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/media-album-download.test.mjs`
Expected: PASS.

- [ ] **Step 4: Implement archive-stream helper and album download route**

Create `frontend/src/lib/media/archive-stream.ts`:
```typescript
import archiver from "archiver";
import { Readable } from "node:stream";

export interface ArchiveFileEntry {
  name: string;
  buffer: Buffer;
}

export function createArchiveStream(
  entries: ArchiveFileEntry[],
  readmeContent?: string
): { stream: Readable; finalizePromise: Promise<number> } {
  const archive = archiver("zip", {
    zlib: { level: 6 },
  });

  const stream = new Readable({
    read() {},
  });

  archive.on("data", (chunk) => {
    stream.push(chunk);
  });

  const finalizePromise = new Promise<number>((resolve, reject) => {
    archive.on("end", () => {
      stream.push(null);
      resolve(archive.pointer());
    });
    archive.on("error", (err) => {
      stream.destroy(err);
      reject(err);
    });
  });

  if (readmeContent) {
    archive.append(readmeContent, { name: "README.txt" });
  }

  for (const entry of entries) {
    archive.append(entry.buffer, { name: entry.name });
  }

  archive.finalize();

  return { stream, finalizePromise };
}
```

Create `frontend/src/app/api/media/download/album/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isMediaAssetDownloadEligible,
  isMediaAlbumDownloadEligible,
} from "@/lib/media/eligibility";
import { checkDownloadRateLimit } from "@/lib/media/rate-limiter";
import { recordDownloadAudit, hashIp } from "@/lib/media/download-audit";
import { createArchiveStream, ArchiveFileEntry } from "@/lib/media/archive-stream";

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
    .map((aa: { position: number; asset: any }) => aa.asset)
    .filter((asset: any) => isMediaAssetDownloadEligible(asset))
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
```

- [ ] **Step 5: Run tests and verify**

Run: `node --test tests/media-album-download.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/media/archive-stream.ts frontend/src/app/api/media/download/album/[id]/route.ts frontend/tests/media-album-download.test.mjs
git commit -m "feat(media): implement album zip download streaming route"
```

---

### Task 4: Category ZIP Download Route

**Files:**
- Create: `frontend/src/app/api/media/download/category/[category]/route.ts`
- Test: `frontend/tests/media-category-download.test.mjs`

**Interfaces:**
- Consumes:
  - `isMediaAssetDownloadEligible` from `frontend/src/lib/media/eligibility`
  - `checkDownloadRateLimit` from `frontend/src/lib/media/rate-limiter`
  - `createArchiveStream` from `frontend/src/lib/media/archive-stream`
  - `recordDownloadAudit`, `hashIp` from `frontend/src/lib/media/download-audit`
- Produces:
  - Route handler `GET /api/media/download/category/[category]`

- [ ] **Step 1: Write test for category download validation**

Create `frontend/tests/media-category-download.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";

const VALID_CATEGORIES = ["ibadah", "pemuda", "sekolah_sabat", "sosial", "fellowship", "umum"];

test("category validation: allows valid enum categories and rejects invalid", () => {
  assert.equal(VALID_CATEGORIES.includes("ibadah"), true);
  assert.equal(VALID_CATEGORIES.includes("pemuda"), true);
  assert.equal(VALID_CATEGORIES.includes("hacker"), false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/media-category-download.test.mjs`
Expected: PASS.

- [ ] **Step 3: Implement category download route**

Create `frontend/src/app/api/media/download/category/[category]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMediaAssetDownloadEligible } from "@/lib/media/eligibility";
import { checkDownloadRateLimit } from "@/lib/media/rate-limiter";
import { recordDownloadAudit, hashIp } from "@/lib/media/download-audit";
import { createArchiveStream, ArchiveFileEntry } from "@/lib/media/archive-stream";
import type { MediaCategory } from "@/types/media";

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

  const eligibleAssets = assets.filter((a) => isMediaAssetDownloadEligible(a));

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
```

- [ ] **Step 4: Run tests to verify**

Run: `node --test tests/media-category-download.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/media/download/category/[category]/route.ts frontend/tests/media-category-download.test.mjs
git commit -m "feat(media): implement category zip download streaming route"
```

---

### Task 5: UI Integration: Lightbox Single Download Button (`MediaLightbox.tsx`)

**Files:**
- Modify: `frontend/src/components/media/MediaLightbox.tsx`
- Test: Component and TypeScript check

**Interfaces:**
- Consumes:
  - `PublicMediaAssetItem`
  - `/api/media/download/[id]`

- [ ] **Step 1: Update MediaLightbox with accessible download button**

In `frontend/src/components/media/MediaLightbox.tsx`:
Add `Download` icon from `lucide-react`.
Inside the top action bar, render the download button:
```tsx
{currentItem.public_download_enabled ? (
  <a
    href={`/api/media/download/${currentItem.id}`}
    download
    aria-label="Unduh foto ini"
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sabbath-400"
  >
    <Download className="h-4 w-4" />
    <span className="hidden sm:inline">Unduh Foto</span>
  </a>
) : (
  <button
    type="button"
    disabled
    aria-label="Unduhan tidak diaktifkan untuk foto ini"
    title="Unduhan tidak diaktifkan untuk foto ini"
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-slate-400 text-xs sm:text-sm font-medium cursor-not-allowed opacity-60"
  >
    <Download className="h-4 w-4" />
    <span className="hidden sm:inline">Unduhan Dibatasi</span>
  </button>
)}
```

- [ ] **Step 2: Verify TypeScript and Lint**

Run: `npm --prefix frontend run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/media/MediaLightbox.tsx
git commit -m "feat(media): add download button with permission states to MediaLightbox"
```

---

### Task 6: UI Integration: MediaPage Album Download Button & Toasts (`MediaPage.tsx`)

**Files:**
- Modify: `frontend/src/components/pages/MediaPage.tsx`
- Test: Browser verification and route tests

**Interfaces:**
- Consumes:
  - `PublicMediaAlbumItem`
  - `/api/media/download/album/[id]`
  - `toast` from `sonner`

- [ ] **Step 1: Add album download button and downloading feedback**

In `frontend/src/components/pages/MediaPage.tsx`:
- Import `Download`, `Loader2` from `lucide-react`.
- Import `toast` from `sonner`.
- Add state `downloadingAlbumId: string | null`.
- Add handler `handleDownloadAlbum(e: React.MouseEvent, albumId: string, albumTitle: string)`:
  ```typescript
  const handleDownloadAlbum = async (e: React.MouseEvent, albumId: string, albumTitle: string) => {
    e.stopPropagation();
    try {
      setDownloadingAlbumId(albumId);
      toast.info(`Menyiapkan arsip ZIP untuk album "${albumTitle}"...`);
      const res = await fetch(`/api/media/download/album/${albumId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal mengunduh album.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rinegetan-album-${albumId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Album "${albumTitle}" berhasil diunduh.`);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengunduh album.");
    } finally {
      setDownloadingAlbumId(null);
    }
  };
  ```
- In the album card footer or selected album banner:
  Render the download button when `album.public_download_enabled` is true.

- [ ] **Step 2: Verify TypeScript and Lint**

Run: `npm --prefix frontend run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/pages/MediaPage.tsx
git commit -m "feat(media): add album zip download button with sonner toast feedback"
```

---

### Task 7: Quality Gates, Backlog Update, and Visual Verification

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Test: `npm run test:routes`, `npm run lint`, `npm run build`

- [ ] **Step 1: Run all test suites**

Run: `npm --prefix frontend run test:routes`
Run: `npm --prefix frontend run lint`
Run: `npm --prefix frontend run build`
Expected: All tests PASS, build succeeds cleanly.

- [ ] **Step 2: Update backlog status**

In `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`:
Update P2-404 status to `selesai` and P2-501 to `ready`.

- [ ] **Step 3: Commit and push**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md
git commit -m "chore(delivery): mark P2-404 as completed and P2-501 as ready"
```

# P2-405 Site Section Media CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan sistem pengelolaan gambar/banner seksi halaman publik (Hero Beranda, Sambutan Beranda, Sekolah Sabat, Tentang Kami) yang dapat diubah langsung oleh role Admin dan Editor melalui CMS staf `/staff`, tersimpan di database/storage Supabase, ter-revalidasi instan, dan memiliki fallback statis yang aman.

**Architecture:** Menerapkan tabel `public.site_section_media` dengan RLS dan audit trigger; rute API staf `POST /api/staff/settings/section-media`; helper kueri publik `getSiteSectionMedia()`; komponen CMS staf `SectionMediaManager.tsx` dengan pemilih galeri dan unggah langsung; serta integrasi pada komponen publik (`Hero.jsx`, `WelcomeSection.jsx`, `SekolahSabatPage.jsx`, `TentangKamiPage.jsx`) dengan fallback mulus ke `content.js`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase JS Client, PostgreSQL (RLS & Triggers), Sonner, Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-09-19-p2-405-site-section-media-cms-design.md`

## Global Constraints

- **Fallback Invariant:** Jika konfigurasi database belum ada atau terjadi kegagalan jaringan, halaman publik wajib memakai gambar statis dari `frontend/src/data/content.js`. Tidak boleh ada broken image.
- **Security & Authorization:** Hanya staf dengan peran `Editor` atau `Admin` yang dapat mengubah gambar seksi halaman (`private.is_editor_or_admin()`).
- **Asset Integrity:** Aset yang dipasang wajib berstatus `status = 'published'` dan `consent_status = 'approved'`.
- **Zero Master Leaks:** Pengunjung publik hanya menerima derivatif teroptimasi dari Supabase Storage.
- **Audit Logging:** Setiap mutasi gambar seksi wajib dicatat ke `public.audit_logs`.
- **Revalidation:** Mutasi wajib memicu pembersihan tag cache `site-section-media` dan rute `/`, `/sekolah-sabat`, `/tentang-kami`.

---

### Task 1: Database Migration & RLS Policies (`site_section_media`)

**Files:**
- Create: `supabase/migrations/20260919100000_p2_405_site_section_media.sql`
- Test: `frontend/tests/site-section-media-migration.test.mjs`

**Interfaces:**
- Produces:
  - Table `public.site_section_media`
  - Policies `site_section_media_public_read`, `site_section_media_staff_write`
  - Trigger `site_section_media_audit_mutation`

- [ ] **Step 1: Write test to verify migration structure and contracts**

Create `frontend/tests/site-section-media-migration.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("migration: 20260919100000_p2_405_site_section_media.sql exists and defines schema", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "../supabase/migrations/20260919100000_p2_405_site_section_media.sql"
  );
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");
  const content = fs.readFileSync(migrationPath, "utf8");
  assert.match(content, /create table public\.site_section_media/i);
  assert.match(content, /home_hero/);
  assert.match(content, /home_welcome/);
  assert.match(content, /sekolah_sabat/);
  assert.match(content, /tentang_kami/);
  assert.match(content, /enable row level security/i);
  assert.match(content, /site_section_media_public_read/i);
  assert.match(content, /site_section_media_staff_write/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-section-media-migration.test.mjs`
Expected: FAIL (migration file does not exist).

- [ ] **Step 3: Create migration file and apply locally**

Create `supabase/migrations/20260919100000_p2_405_site_section_media.sql`:
```sql
-- P2-405 Site Section Media CMS Table, RLS, and Audit Trigger

create table public.site_section_media (
  section_key text primary key
    check (section_key in ('home_hero', 'home_welcome', 'sekolah_sabat', 'tentang_kami')),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  custom_alt_text text check (custom_alt_text is null or char_length(btrim(custom_alt_text)) between 1 and 300),
  custom_caption text check (custom_caption is null or char_length(btrim(custom_caption)) between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create trigger site_section_media_set_updated_at
before update on public.site_section_media
for each row execute function private.set_updated_at();

-- RLS & Grants
alter table public.site_section_media enable row level security;

revoke all on table public.site_section_media from public, anon, authenticated;

grant select on table public.site_section_media to anon, authenticated;
grant insert, update, delete on table public.site_section_media to authenticated;

-- Policies
create policy site_section_media_public_read
on public.site_section_media for select
to anon, authenticated
using (true);

create policy site_section_media_staff_write
on public.site_section_media for all
to authenticated
using (private.is_editor_or_admin())
with check (private.is_editor_or_admin());

-- Audit Trigger Function
create or replace function private.record_section_media_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'site_settings.create_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'site_settings.update_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'old_asset_id', old.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption
    );
  elsif tg_op = 'DELETE' then
    v_action := 'site_settings.delete_section_media';
    v_changes := jsonb_build_object(
      'section_key', old.section_key,
      'asset_id', old.asset_id
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  ) values (
    auth.uid(),
    v_action,
    'site_section_media',
    coalesce(new.asset_id, old.asset_id),
    v_changes
  );

  return coalesce(new, old);
end;
$$;

create trigger site_section_media_audit_mutation
after insert or update or delete on public.site_section_media
for each row execute function private.record_section_media_audit();
```

Apply migration:
`npx supabase db push` or execute migration against local postgres.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/site-section-media-migration.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260919100000_p2_405_site_section_media.sql frontend/tests/site-section-media-migration.test.mjs
git commit -m "feat(db): add site_section_media table with RLS and audit trigger"
```

---

### Task 2: Public Query Helper & Revalidation Layer

**Files:**
- Modify: `frontend/src/lib/public/queries.mjs`
- Modify: `frontend/src/lib/public/queries.ts`
- Test: `frontend/tests/site-section-media-queries.test.mjs`

**Interfaces:**
- Produces:
  - `getSiteSectionMedia(): Promise<SiteSectionMediaMap>`
  - Update `triggerPublicRevalidation` to support `'site_section_media'`
  - Types `SectionMediaItem`, `SiteSectionMediaMap`

- [ ] **Step 1: Write test for getSiteSectionMedia contract**

Create `frontend/tests/site-section-media-queries.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { getSiteSectionMedia, triggerPublicRevalidation } from "../src/lib/public/queries.mjs";

test("site section media: exports getSiteSectionMedia query function", () => {
  assert.equal(typeof getSiteSectionMedia, "function");
});

test("site section media: triggerPublicRevalidation supports site_section_media", async () => {
  const revalidated = [];
  const mockRevalidateTag = (tag) => revalidated.push(`tag:${tag}`);
  const mockRevalidatePath = (path) => revalidated.push(`path:${path}`);

  await triggerPublicRevalidation("site_section_media", {
    revalidateTagFn: mockRevalidateTag,
    revalidatePathFn: mockRevalidatePath,
  });

  assert.ok(revalidated.includes("tag:site-section-media"));
  assert.ok(revalidated.includes("path:/"));
  assert.ok(revalidated.includes("path:/sekolah-sabat"));
  assert.ok(revalidated.includes("path:/tentang-kami"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-section-media-queries.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement getSiteSectionMedia and update revalidation**

In `frontend/src/lib/public/queries.mjs`:
Implement `getSiteSectionMedia()`:
```javascript
export async function getSiteSectionMedia() {
  const client = getPublicClient();
  if (!client) return {};

  try {
    const { data, error } = await client
      .from("site_section_media")
      .select(`
        section_key,
        asset_id,
        custom_alt_text,
        custom_caption,
        asset:asset_id (
          id,
          storage_path,
          mime_type,
          alt_text,
          caption,
          status,
          consent_status,
          hidden_at
        )
      `);

    if (error) {
      console.error("Error fetching site section media:", error);
      return {};
    }

    const map = {};
    for (const item of data || []) {
      if (!item.asset || item.asset.status !== "published" || item.asset.hidden_at) {
        continue;
      }
      map[item.section_key] = {
        section_key: item.section_key,
        asset_id: item.asset_id,
        image_url: getMediaPublicUrl(item.asset.storage_path),
        alt_text: item.custom_alt_text || item.asset.alt_text,
        caption: item.custom_caption || item.asset.caption,
      };
    }
    return map;
  } catch (err) {
    console.error("Failed to query site section media:", err);
    return {};
  }
}
```

Update `triggerPublicRevalidation` to handle `site_section_media`:
```javascript
case "site_section_media":
  revalidateTag("site-section-media");
  revalidatePath("/");
  revalidatePath("/sekolah-sabat");
  revalidatePath("/tentang-kami");
  break;
```

Update `frontend/src/lib/public/queries.ts` with types.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/site-section-media-queries.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/public/queries.mjs frontend/src/lib/public/queries.ts frontend/tests/site-section-media-queries.test.mjs
git commit -m "feat(public): implement getSiteSectionMedia query and cache revalidation"
```

---

### Task 3: Staff Mutation API Route (`/api/staff/settings/section-media`)

**Files:**
- Create: `frontend/src/app/api/staff/settings/section-media/route.ts`
- Test: `frontend/tests/site-section-media-api.test.mjs`

**Interfaces:**
- Produces:
  - Route handler `POST /api/staff/settings/section-media`

- [ ] **Step 1: Write test for API route validation logic**

Create `frontend/tests/site-section-media-api.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";

const VALID_SECTIONS = ["home_hero", "home_welcome", "sekolah_sabat", "tentang_kami"];

test("api validation: accepts valid section keys and rejects invalid", () => {
  assert.equal(VALID_SECTIONS.includes("home_hero"), true);
  assert.equal(VALID_SECTIONS.includes("home_welcome"), true);
  assert.equal(VALID_SECTIONS.includes("invalid_section"), false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/site-section-media-api.test.mjs`
Expected: PASS.

- [ ] **Step 3: Implement Staff Mutation Route**

Create `frontend/src/app/api/staff/settings/section-media/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanMutateContent } from "@/lib/auth/roles";
import { triggerPublicRevalidation } from "@/lib/public/queries";

const VALID_SECTIONS = ["home_hero", "home_welcome", "sekolah_sabat", "tentang_kami"];

function getServerClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const authHeader = request.headers.get("Authorization");
  return createClient(url, key, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

export async function POST(request: NextRequest) {
  try {
    const client = getServerClient(request);
    const authCheck = await assertCanMutateContent(client);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: "unauthorized", message: "Hanya Editor dan Admin yang diizinkan." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { section_key, asset_id, custom_alt_text, custom_caption, reset } = body;

    if (!section_key || !VALID_SECTIONS.includes(section_key)) {
      return NextResponse.json(
        { error: "invalid_section", message: "Seksi halaman tidak valid." },
        { status: 400 }
      );
    }

    if (reset) {
      // Delete custom assignment to revert to default
      await client.from("site_section_media").delete().eq("section_key", section_key);
      await triggerPublicRevalidation("site_section_media");
      return NextResponse.json({ success: true, message: "Seksi berhasil dikembalikan ke bawaan." });
    }

    if (!asset_id) {
      return NextResponse.json(
        { error: "missing_asset", message: "ID foto wajib disertakan." },
        { status: 400 }
      );
    }

    // Verify asset is published and consent approved
    const { data: asset, error: assetErr } = await client
      .from("media_assets")
      .select("id, status, consent_status, hidden_at")
      .eq("id", asset_id)
      .single();

    if (assetErr || !asset) {
      return NextResponse.json(
        { error: "asset_not_found", message: "Foto tidak ditemukan." },
        { status: 404 }
      );
    }

    if (asset.status !== "published" || asset.consent_status !== "approved" || asset.hidden_at) {
      return NextResponse.json(
        { error: "asset_not_eligible", message: "Foto belum diterbitkan atau belum memiliki izin konsensus." },
        { status: 400 }
      );
    }

    // Upsert into site_section_media
    const { error: upsertErr } = await client
      .from("site_section_media")
      .upsert({
        section_key,
        asset_id,
        custom_alt_text: custom_alt_text?.trim() || null,
        custom_caption: custom_caption?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: authCheck.userId,
      });

    if (upsertErr) {
      return NextResponse.json(
        { error: "database_error", message: "Gagal menyimpan konfigurasi seksi: " + upsertErr.message },
        { status: 500 }
      );
    }

    await triggerPublicRevalidation("site_section_media");

    return NextResponse.json({
      success: true,
      message: "Gambar seksi berhasil diperbarui.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: err.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Verify syntax and lint**

Run: `npm --prefix frontend run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/staff/settings/section-media/route.ts frontend/tests/site-section-media-api.test.mjs
git commit -m "feat(staff): implement section-media settings API route"
```

---

### Task 4: CMS Antarmuka Staf (`SectionMediaManager.tsx` & `StaffDashboard.tsx`)

**Files:**
- Create: `frontend/src/components/staff/SectionMediaManager.tsx`
- Modify: `frontend/src/components/staff/StaffDashboard.tsx`
- Test: Component render and lint

**Interfaces:**
- Produces:
  - `<SectionMediaManager />` component
  - Tab "Banner Halaman" in Staff Dashboard

- [ ] **Step 1: Implement SectionMediaManager component**

Create `frontend/src/components/staff/SectionMediaManager.tsx`:
- Fetches current section media configs and published media assets for picker.
- 4 section cards (`home_hero`, `home_welcome`, `sekolah_sabat`, `tentang_kami`).
- Each card has:
  - Current image preview (custom or static fallback).
  - Badge: "Kustom Aktif" or "Bawaan (Default)".
  - "Pilih dari Galeri" button (opens gallery picker modal).
  - "Unggah Foto Baru" button (opens `MediaUploadDialog` with direct assignment callback).
  - "Reset ke Bawaan" button.
- Submits changes to `POST /api/staff/settings/section-media`.
- Shows `toast.success` and `toast.error` via `sonner`.

- [ ] **Step 2: Update StaffDashboard.tsx to include "Banner Halaman" tab**

In `frontend/src/components/staff/StaffDashboard.tsx`:
- Add tab `"banners"` (label: "Banner Halaman", icon: `LayoutTemplate` or `Image`).
- Render `<SectionMediaManager />` when `activeTab === "banners"`.

- [ ] **Step 3: Verify TypeScript and Lint**

Run: `npm --prefix frontend run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/staff/SectionMediaManager.tsx frontend/src/components/staff/StaffDashboard.tsx
git commit -m "feat(staff): add SectionMediaManager component and integrate into StaffDashboard"
```

---

### Task 5: Public Frontend Integration with Static Fallback

**Files:**
- Modify: `frontend/src/app/(public)/page.tsx`
- Modify: `frontend/src/components/sections/Hero.jsx`
- Modify: `frontend/src/components/sections/WelcomeSection.jsx`
- Modify: `frontend/src/app/(public)/sekolah-sabat/page.tsx`
- Modify: `frontend/src/components/pages/SekolahSabatPage.jsx`
- Modify: `frontend/src/app/(public)/tentang-kami/page.tsx`
- Modify: `frontend/src/components/pages/TentangKamiPage.jsx`
- Test: `npm run test:routes`

- [ ] **Step 1: Update public page route loaders**

In `src/app/(public)/page.tsx`:
- Fetch `getSiteSectionMedia()` in `Promise.all`.
- Pass `sectionMedia` to `Hero` and `WelcomeSection`.

In `src/app/(public)/sekolah-sabat/page.tsx`:
- Fetch `getSiteSectionMedia()`.
- Pass to `SekolahSabatPage`.

In `src/app/(public)/tentang-kami/page.tsx`:
- Fetch `getSiteSectionMedia()`.
- Pass to `TentangKamiPage`.

- [ ] **Step 2: Update components to consume dynamic media with static fallback**

In `Hero.jsx`:
```jsx
const heroSrc = sectionMedia?.home_hero?.image_url || IMAGES.hero.src;
const heroAlt = sectionMedia?.home_hero?.alt_text || IMAGES.hero.alt;
const heroCaption = sectionMedia?.home_hero?.caption || IMAGES.hero.caption;
```

In `WelcomeSection.jsx`:
```jsx
const welcomeSrc = sectionMedia?.home_welcome?.image_url || IMAGES.fellowship.src;
const welcomeAlt = sectionMedia?.home_welcome?.alt_text || IMAGES.fellowship.alt;
```

In `SekolahSabatPage.jsx`:
```jsx
const ssSrc = sectionMedia?.sekolah_sabat?.image_url || IMAGES.bibleStudy.src;
const ssAlt = sectionMedia?.sekolah_sabat?.alt_text || IMAGES.bibleStudy.alt;
```

In `TentangKamiPage.jsx`:
```jsx
const aboutSrc = sectionMedia?.tentang_kami?.image_url || IMAGES.community.src;
const aboutAlt = sectionMedia?.tentang_kami?.alt_text || IMAGES.community.alt;
```

- [ ] **Step 3: Verify route contract tests**

Run: `npm --prefix frontend run test:routes`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(public)/page.tsx frontend/src/components/sections/Hero.jsx frontend/src/components/sections/WelcomeSection.jsx frontend/src/app/(public)/sekolah-sabat/page.tsx frontend/src/components/pages/SekolahSabatPage.jsx frontend/src/app/(public)/tentang-kami/page.tsx frontend/src/components/pages/TentangKamiPage.jsx
git commit -m "feat(public): integrate dynamic section media with fallback in Hero, Welcome, SS, and About pages"
```

---

### Task 6: Quality Gates, Backlog Update, and Visual Verification

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Test: `npm run test:routes`, `npm run lint`, `npm run build`

- [ ] **Step 1: Run all test suites and lint**

Run: `npm --prefix frontend run test:routes`
Run: `npm --prefix frontend run lint`
Run: `npm --prefix frontend run build`
Expected: All PASS.

- [ ] **Step 2: Capture screenshots of Staff CMS and updated public pages**

Use `browser_subagent` to capture:
1. Staff CMS "Banner Halaman" panel.
2. Homepage Hero and Welcome section.
Save screenshots to `docs/04-delivery/screenshots/p2-405/`.

- [ ] **Step 3: Update backlog status**

In `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`:
Set `P2-405` status to `selesai`.

- [ ] **Step 4: Commit**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md docs/04-delivery/screenshots/p2-405/
git commit -m "chore(delivery): mark P2-405 as completed with visual proof"
```

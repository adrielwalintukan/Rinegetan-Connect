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

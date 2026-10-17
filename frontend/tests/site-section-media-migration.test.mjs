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

test("migration: 20261018000000_p2_405_section_media_audit_and_constraint.sql defines constraint and audit delta", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "../supabase/migrations/20261018000000_p2_405_section_media_audit_and_constraint.sql"
  );
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");
  const content = fs.readFileSync(migrationPath, "utf8");

  // Check constraint on allowed position values
  assert.match(content, /site_section_media_object_position_check/);
  assert.match(content, /'top', 'center', 'bottom', 'contain'/);

  // Audit trigger captures object_position and old_object_position
  assert.match(content, /'object_position', new\.object_position/);
  assert.match(content, /'old_object_position', old\.object_position/);

  // Content mutation audit captures reason
  assert.match(content, /create or replace function public\.set_audit_reason/);
  assert.match(content, /'reason', coalesce/);
});

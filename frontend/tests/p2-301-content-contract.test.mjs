import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");

const readText = (path) => readFileSync(path, "utf8");

test("P2-301 migration file exists and declares content schema with RLS and grants", () => {
  const migrationPath = resolve(
    repositoryRoot,
    "supabase",
    "migrations",
    "20260917165000_p2_301_content_cms_schema.sql"
  );
  assert.ok(existsSync(migrationPath), "Migration file P2-301 harus ada");

  const sql = readText(migrationPath);

  // Enum and tables
  assert.match(sql, /create type public\.content_status as enum \('draft', 'published', 'archived'\);/i);
  assert.match(sql, /create table public\.departments/i);
  assert.match(sql, /create table public\.announcements/i);
  assert.match(sql, /create table public\.events/i);

  // Slugs and Constraints
  assert.match(sql, /\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$/);
  assert.match(sql, /events_ends_at_check check \(ends_at >= starts_at\)/i);
  assert.match(sql, /timezone text not null default 'Asia\/Makassar'/i);
  assert.match(sql, /cover_asset_id uuid/i);

  // RLS enablement
  assert.match(sql, /alter table public\.departments enable row level security;/i);
  assert.match(sql, /alter table public\.announcements enable row level security;/i);
  assert.match(sql, /alter table public\.events enable row level security;/i);

  // Explicit grants
  assert.match(sql, /revoke all on table public\.departments, public\.announcements, public\.events from public, anon, authenticated;/i);
  assert.match(sql, /grant select on table public\.departments, public\.announcements, public\.events to anon, authenticated;/i);
  assert.match(sql, /grant insert, update, delete on table public\.departments, public\.announcements, public\.events to authenticated;/i);

  // Audit triggers
  assert.match(sql, /departments_audit_mutation/);
  assert.match(sql, /announcements_audit_mutation/);
  assert.match(sql, /events_audit_mutation/);
  assert.match(sql, /record_content_mutation_audit/);
});

test("P2-301 pgTAP test contract exists and tests allow/deny policies", () => {
  const testPath = resolve(
    repositoryRoot,
    "supabase",
    "tests",
    "p2_301_content_schema.test.sql"
  );
  assert.ok(existsSync(testPath), "pgTAP test file P2-301 harus ada");

  const testSql = readText(testPath);
  assert.match(testSql, /content_status permits only draft, published, and archived/);
  assert.match(testSql, /anon can select published announcements/);
  assert.match(testSql, /anon cannot see non-published announcements/);
  assert.match(testSql, /editor can view all announcements/);
  assert.match(testSql, /admin can delete announcement permanently/);
  assert.match(testSql, /content mutations produce audit log entries/);
});

test("P2-301 TypeScript types file exists and exports required interfaces", () => {
  const typesPath = resolve(frontendRoot, "src", "types", "content.ts");
  assert.ok(existsSync(typesPath), "TypeScript types file content.ts harus ada");

  const typesContent = readText(typesPath);
  assert.match(typesContent, /export type ContentStatus = "draft" \| "published" \| "archived";/);
  assert.match(typesContent, /export interface Department/);
  assert.match(typesContent, /export interface Announcement/);
  assert.match(typesContent, /export interface EventItem/);
});

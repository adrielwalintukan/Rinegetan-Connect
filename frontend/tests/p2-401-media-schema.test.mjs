import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");

const readText = (path) => readFileSync(path, "utf8");

test("P2-401 migration file exists and declares media, consent, and storage schema with RLS", () => {
  const migrationPath = resolve(
    repositoryRoot,
    "supabase",
    "migrations",
    "20260917220000_p2_401_media_schema_consent_storage.sql"
  );
  assert.ok(existsSync(migrationPath), "Migration file P2-401 harus ada");

  const sql = readText(migrationPath);

  // Enums
  assert.match(sql, /create type public\.media_category as enum \('ibadah', 'pemuda', 'sekolah_sabat', 'sosial', 'fellowship', 'umum'\);/i);
  assert.match(sql, /create type public\.media_processing_state as enum \('pending', 'ready', 'failed'\);/i);
  assert.match(sql, /create type public\.consent_status as enum \('pending', 'approved', 'rejected', 'revoked'\);/i);
  assert.match(sql, /create type public\.subject_age_group as enum \('general', 'child'\);/i);

  // Tables
  assert.match(sql, /create table public\.media_albums/i);
  assert.match(sql, /create table public\.media_assets/i);
  assert.match(sql, /create table public\.album_assets/i);
  assert.match(sql, /create table public\.consent_records/i);

  // Child Protection & Hidden Constraints
  assert.match(sql, /media_assets_child_consent_check check/i);
  assert.match(sql, /subject_age_group != 'child' or status != 'published' or consent_status = 'approved'/i);
  assert.match(sql, /media_assets_hidden_reason_check check/i);

  // RLS enablement
  assert.match(sql, /alter table public\.media_albums enable row level security;/i);
  assert.match(sql, /alter table public\.media_assets enable row level security;/i);
  assert.match(sql, /alter table public\.album_assets enable row level security;/i);
  assert.match(sql, /alter table public\.consent_records enable row level security;/i);

  // Supabase Storage bucket registration & RLS policies
  assert.match(sql, /insert into storage\.buckets/i);
  assert.match(sql, /'media'/i);
  assert.match(sql, /media_storage_public_read/i);
  assert.match(sql, /media_storage_staff_read/i);
  assert.match(sql, /media_storage_staff_insert/i);
  assert.match(sql, /media_storage_staff_update/i);
  assert.match(sql, /media_storage_admin_delete/i);
});

test("P2-401 pgTAP test contract exists and checks media schema & security integrity", () => {
  const testPath = resolve(
    repositoryRoot,
    "supabase",
    "tests",
    "p2_401_media_schema.test.sql"
  );
  assert.ok(existsSync(testPath), "pgTAP test file P2-401 harus ada");

  const sql = readText(testPath);
  assert.match(sql, /has_table\('public', 'media_albums'\)/i);
  assert.match(sql, /has_table\('public', 'media_assets'\)/i);
  assert.match(sql, /has_table\('public', 'album_assets'\)/i);
  assert.match(sql, /has_table\('public', 'consent_records'\)/i);
  assert.match(sql, /child consent/i);
});

test("P2-401 TypeScript types file exists and exports media interfaces", async () => {
  const typesPath = resolve(
    frontendRoot,
    "src",
    "types",
    "media.ts"
  );
  assert.ok(existsSync(typesPath), "TypeScript types file frontend/src/types/media.ts harus ada");

  const text = readText(typesPath);
  assert.match(text, /export type MediaCategory/);
  assert.match(text, /export type MediaProcessingState/);
  assert.match(text, /export type ConsentStatus/);
  assert.match(text, /export type SubjectAgeGroup/);
  assert.match(text, /export interface MediaAlbum/);
  assert.match(text, /export interface MediaAsset/);
  assert.match(text, /export interface AlbumAsset/);
  assert.match(text, /export interface ConsentRecord/);
});

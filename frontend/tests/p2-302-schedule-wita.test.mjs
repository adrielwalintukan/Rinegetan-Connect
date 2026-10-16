import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  WITA_TIMEZONE,
  DAY_NAMES_ID,
  formatWitaTime,
  formatWitaDate,
  formatWitaRange,
  getDayNameId,
  resolveWeeklyOccurrences,
} from "../src/lib/schedule-wita.mjs";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");

const readText = (path) => readFileSync(path, "utf8");

test("P2-302 migration file exists and declares schedules schema with RLS and triggers", () => {
  const migrationPath = resolve(
    repositoryRoot,
    "supabase",
    "migrations",
    "20260917183000_p2_302_wita_schedules_and_exceptions.sql"
  );
  assert.ok(existsSync(migrationPath), "Migration file P2-302 harus ada");

  const sql = readText(migrationPath);

  // Tables
  assert.match(sql, /create table if not exists public\.schedules/i);
  assert.match(sql, /create table if not exists public\.schedule_exceptions/i);

  // Constraints
  assert.match(sql, /chk_schedules_day_of_week check \(day_of_week between 0 and 6\)/i);
  assert.match(sql, /chk_schedules_timezone check \(timezone = 'Asia\/Makassar'\)/i);
  assert.match(sql, /chk_schedule_exceptions_action check \(action in \('cancelled', 'override', 'added'\)\)/i);
  assert.match(sql, /uq_schedule_exception_per_schedule_date unique/i);

  // RLS & Grants
  assert.match(sql, /alter table public\.schedules enable row level security;/i);
  assert.match(sql, /alter table public\.schedule_exceptions enable row level security;/i);
  assert.match(sql, /revoke all on table public\.schedules, public\.schedule_exceptions from public, anon, authenticated;/i);
  assert.match(sql, /grant select on table public\.schedules, public\.schedule_exceptions to anon, authenticated;/i);

  // Triggers
  assert.match(sql, /schedules_audit_mutation/i);
  assert.match(sql, /schedule_exceptions_audit_mutation/i);
  assert.match(sql, /record_schedule_mutation_audit/i);
});

test("P2-302 pgTAP test contract exists and checks schedules schema integrity", () => {
  const testPath = resolve(
    repositoryRoot,
    "supabase",
    "tests",
    "p2_302_schedules_schema.test.sql"
  );
  assert.ok(existsSync(testPath), "pgTAP test file P2-302 harus ada");

  const testSql = readText(testPath);
  assert.match(testSql, /schedules table exists/);
  assert.match(testSql, /schedule_exceptions table exists/);
  assert.match(testSql, /schedules enforces day_of_week between 0 and 6/);
  assert.match(testSql, /schedules enforces Asia\/Makassar timezone/);
  assert.match(testSql, /schedules has select policy/);
  assert.match(testSql, /schedule_exceptions has select policy/);
});

test("P2-302 TypeScript types file exists and exports schedule interfaces", () => {
  const typesPath = resolve(frontendRoot, "src", "types", "schedule.ts");
  assert.ok(existsSync(typesPath), "TypeScript types file schedule.ts harus ada");

  const content = readText(typesPath);
  assert.match(content, /export type DayOfWeek = 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6;/);
  assert.match(content, /export type ScheduleExceptionAction = "cancelled" \| "override" \| "added";/);
  assert.match(content, /export interface Schedule/);
  assert.match(content, /export interface ScheduleException/);
  assert.match(content, /export interface ResolvedOccurrence/);
});

test("WITA formatting helpers format time, date, and ranges correctly in Asia/Makassar context", () => {
  assert.equal(WITA_TIMEZONE, "Asia/Makassar");
  assert.equal(DAY_NAMES_ID[6], "Sabat (Sabtu)");
  assert.equal(getDayNameId(0), "Minggu");
  assert.equal(getDayNameId(3), "Rabu");
  assert.equal(getDayNameId(5), "Jumat");
  assert.equal(getDayNameId(6), "Sabat (Sabtu)");

  assert.equal(formatWitaTime("08:45:00"), "08.45 WITA");
  assert.equal(formatWitaTime("08:45"), "08.45 WITA");
  assert.equal(formatWitaTime("19:00:00"), "19.00 WITA");

  assert.equal(formatWitaRange("08:45:00", "10:15:00"), "08.45 – 10.15 WITA");
  assert.equal(formatWitaRange("08:45:00", null), "08.45 WITA");

  assert.equal(formatWitaDate("2026-09-19"), "Sabtu, 19 September 2026");
  assert.equal(formatWitaDate("2026-09-23"), "Rabu, 23 September 2026");
});

test("resolveWeeklyOccurrences expands recurring schedules across multi-week range", () => {
  const schedules = [
    {
      id: "sch-sabbath-school",
      name: "Sekolah Sabat",
      slug: "sekolah-sabat",
      day_of_week: 6, // Sabat
      start_time: "08:45:00",
      end_time: "10:00:00",
      timezone: "Asia/Makassar",
      location: "Gereja GMAHK Rinegetan",
      category: "Sekolah Sabat",
      status: "published",
      position: 1,
    },
    {
      id: "sch-divine-service",
      name: "Ibadah Sabat & Khotbah",
      slug: "ibadah-sabat-khotbah",
      day_of_week: 6, // Sabat
      start_time: "10:15:00",
      end_time: "12:00:00",
      timezone: "Asia/Makassar",
      location: "Gereja GMAHK Rinegetan",
      category: "Ibadah",
      status: "published",
      position: 2,
    },
    {
      id: "sch-prayer-meeting",
      name: "Kebaktian Permintaan Doa",
      slug: "kebaktian-doa",
      day_of_week: 3, // Rabu
      start_time: "19:00:00",
      end_time: "20:00:00",
      timezone: "Asia/Makassar",
      location: "Gereja GMAHK Rinegetan",
      category: "Doa",
      status: "published",
      position: 3,
    },
  ];

  const exceptions = [];

  // Range from 2026-09-13 (Sunday) to 2026-09-27 (Sunday)
  // Contains:
  // - Rabu 2026-09-16 (Prayer)
  // - Sabat 2026-09-19 (SS & Divine Service)
  // - Rabu 2026-09-23 (Prayer)
  // - Sabat 2026-09-26 (SS & Divine Service)
  const results = resolveWeeklyOccurrences(schedules, exceptions, "2026-09-13", "2026-09-27");

  assert.equal(results.length, 6, "Harus menghasilkan tepat 6 kejadian dalam 2 pekan");

  assert.equal(results[0].date, "2026-09-16");
  assert.equal(results[0].name, "Kebaktian Permintaan Doa");
  assert.equal(results[0].startTime, "19:00");

  assert.equal(results[1].date, "2026-09-19");
  assert.equal(results[1].name, "Sekolah Sabat");
  assert.equal(results[1].startTime, "08:45");

  assert.equal(results[2].date, "2026-09-19");
  assert.equal(results[2].name, "Ibadah Sabat & Khotbah");
  assert.equal(results[2].startTime, "10:15");

  assert.equal(results[3].date, "2026-09-23");
  assert.equal(results[3].name, "Kebaktian Permintaan Doa");

  assert.equal(results[4].date, "2026-09-26");
  assert.equal(results[4].name, "Sekolah Sabat");

  assert.equal(results[5].date, "2026-09-26");
  assert.equal(results[5].name, "Ibadah Sabat & Khotbah");
});

test("resolveWeeklyOccurrences correctly applies cancelled, override, and added exceptions", () => {
  const schedules = [
    {
      id: "sch-vesper",
      name: "Vesper Pemuda",
      slug: "vesper-pemuda",
      day_of_week: 5, // Jumat
      start_time: "18:30:00",
      end_time: "20:00:00",
      timezone: "Asia/Makassar",
      location: "Gereja GMAHK Rinegetan",
      category: "Pemuda",
      status: "published",
      position: 1,
    },
    {
      id: "sch-divine-service",
      name: "Ibadah Sabat",
      slug: "ibadah-sabat",
      day_of_week: 6, // Sabat
      start_time: "10:15:00",
      end_time: "12:00:00",
      timezone: "Asia/Makassar",
      location: "Gereja GMAHK Rinegetan",
      category: "Ibadah",
      status: "published",
      position: 2,
    },
  ];

  const exceptions = [
    // Exception 1: Cancel Vesper on 2026-09-18
    {
      id: "exc-1",
      schedule_id: "sch-vesper",
      exception_date: "2026-09-18",
      action: "cancelled",
      reason: "Persiapan Perkemahan",
      status: "published",
    },
    // Exception 2: Override Ibadah Sabat on 2026-09-19 (jam dimajukan & lokasi gedung aula)
    {
      id: "exc-2",
      schedule_id: "sch-divine-service",
      exception_date: "2026-09-19",
      action: "override",
      custom_name: "Ibadah Sabat Gabungan",
      custom_start_time: "09:00:00",
      custom_end_time: "11:30:00",
      custom_location: "Gedung Serbaguna Tondano",
      reason: "Ibadah Sabat Gabungan se-Wilayah",
      status: "published",
    },
    // Exception 3: Add special one-off prayer service on Tuesday 2026-09-15
    {
      id: "exc-3",
      schedule_id: null,
      exception_date: "2026-09-15",
      action: "added",
      custom_name: "Doa Semalam Suntuk",
      custom_start_time: "21:00:00",
      custom_end_time: "23:00:00",
      custom_location: "Rumah Keluarga Sumanti",
      reason: "Doa pergumulan jemaat",
      status: "published",
    },
  ];

  const results = resolveWeeklyOccurrences(schedules, exceptions, "2026-09-14", "2026-09-20");

  assert.equal(results.length, 3, "Harus menghasilkan 3 kejadian (1 added, 1 cancelled, 1 override)");

  // Item 1: Added on 2026-09-15
  assert.equal(results[0].date, "2026-09-15");
  assert.equal(results[0].name, "Doa Semalam Suntuk");
  assert.equal(results[0].startTime, "21:00");
  assert.equal(results[0].location, "Rumah Keluarga Sumanti");
  assert.equal(results[0].isAdded, true);
  assert.equal(results[0].isCancelled, false);
  assert.equal(results[0].reason, "Doa pergumulan jemaat");

  // Item 2: Cancelled on 2026-09-18
  assert.equal(results[1].date, "2026-09-18");
  assert.equal(results[1].name, "Vesper Pemuda");
  assert.equal(results[1].isCancelled, true);
  assert.equal(results[1].reason, "Persiapan Perkemahan");

  // Item 3: Override on 2026-09-19
  assert.equal(results[2].date, "2026-09-19");
  assert.equal(results[2].name, "Ibadah Sabat Gabungan");
  assert.equal(results[2].startTime, "09:00");
  assert.equal(results[2].endTime, "11:30");
  assert.equal(results[2].location, "Gedung Serbaguna Tondano");
  assert.equal(results[2].isOverridden, true);
  assert.equal(results[2].isCancelled, false);
  assert.equal(results[2].reason, "Ibadah Sabat Gabungan se-Wilayah");
});

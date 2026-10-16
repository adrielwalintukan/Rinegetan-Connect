import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  SUPPORTED_ENTITIES,
  VALID_STATUSES,
  validateStatusTransition,
  validateDeletePayload,
  assertCanMutateStatus,
  assertCanDeletePermanently,
  sanitizeSavePayload,
  normalizeWitaDateTime,
} from "../src/lib/staff/content-mutations.mjs";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));

const readText = (path) => readFileSync(path, "utf8");

test("Supported entities and valid statuses constants are defined correctly", () => {
  assert.deepEqual(SUPPORTED_ENTITIES, [
    "announcements",
    "events",
    "departments",
    "schedules",
    "media_assets",
  ]);
  assert.deepEqual(VALID_STATUSES, ["draft", "published", "archived"]);
});

test("validateStatusTransition accepts valid lifecycle changes and rejects invalid ones", () => {
  // Valid transitions
  assert.equal(validateStatusTransition("draft", "published"), true);
  assert.equal(validateStatusTransition("published", "archived"), true);
  assert.equal(validateStatusTransition("archived", "draft"), true);
  assert.equal(validateStatusTransition("draft", "archived"), true);
  assert.equal(validateStatusTransition("published", "draft"), true);

  // Invalid targets
  assert.equal(validateStatusTransition("draft", "deleted"), false);
  assert.equal(validateStatusTransition("published", "pending"), false);
  assert.equal(validateStatusTransition("archived", ""), false);
  assert.equal(validateStatusTransition("draft", null), false);
});

test("validateDeletePayload requires a non-empty, meaningful reason", () => {
  // Valid reasons (min 5 chars)
  assert.equal(validateDeletePayload("Acara telah dibatalkan").valid, true);
  assert.equal(validateDeletePayload("Pengumuman duplikat").valid, true);

  // Invalid reasons
  assert.equal(validateDeletePayload("").valid, false);
  assert.equal(validateDeletePayload("   ").valid, false);
  assert.equal(validateDeletePayload("xyz").valid, false); // too short (< 5 chars)
  assert.equal(validateDeletePayload(null).valid, false);
});

test("assertCanMutateStatus allows both editor and admin", () => {
  assert.doesNotThrow(() => assertCanMutateStatus("editor"));
  assert.doesNotThrow(() => assertCanMutateStatus("admin"));
  assert.throws(() => assertCanMutateStatus("guest"), /not_staff/);
  assert.throws(() => assertCanMutateStatus(""), /not_staff/);
});

test("assertCanDeletePermanently allows only admin and strictly rejects editor", () => {
  // Admin is allowed
  assert.doesNotThrow(() => assertCanDeletePermanently("admin"));

  // Editor is strictly rejected
  assert.throws(
    () => assertCanDeletePermanently("editor"),
    (err) => err.code === "not_admin" || err.message.includes("not_admin")
  );

  // Non-staff rejected
  assert.throws(() => assertCanDeletePermanently("guest"), /not_admin/);
});

test("Content mutation API route files exist and define POST handlers", () => {
  const statusRoutePath = resolve(
    frontendRoot,
    "src",
    "app",
    "api",
    "staff",
    "content",
    "status",
    "route.ts"
  );
  assert.ok(existsSync(statusRoutePath), "API route status/route.ts harus ada");
  assert.match(readText(statusRoutePath), /export async function POST/);

  const saveRoutePath = resolve(
    frontendRoot,
    "src",
    "app",
    "api",
    "staff",
    "content",
    "save",
    "route.ts"
  );
  assert.ok(existsSync(saveRoutePath), "API route save/route.ts harus ada");
  assert.match(readText(saveRoutePath), /export async function POST/);

  const deleteRoutePath = resolve(
    frontendRoot,
    "src",
    "app",
    "api",
    "staff",
    "content",
    "delete",
    "route.ts"
  );
  assert.ok(existsSync(deleteRoutePath), "API route delete/route.ts harus ada");
  assert.match(readText(deleteRoutePath), /export async function POST/);
});

test("normalizeWitaDateTime appends WITA (+08:00) offset correctly", () => {
  assert.equal(
    normalizeWitaDateTime("2026-10-24T18:00"),
    "2026-10-24T18:00:00+08:00"
  );
  assert.equal(
    normalizeWitaDateTime("2026-10-24T18:00:00"),
    "2026-10-24T18:00:00+08:00"
  );
  assert.equal(
    normalizeWitaDateTime("2026-10-24T10:00:00Z"),
    "2026-10-24T10:00:00Z"
  );
  assert.equal(
    normalizeWitaDateTime("2026-10-24T18:00:00+08:00"),
    "2026-10-24T18:00:00+08:00"
  );
});

test("sanitizeSavePayload strips disallowed fields such as category from events and formats WITA timestamps", () => {
  const dirtyEventPayload = {
    title: "Kebaktian Sabat Istimewa",
    description: "Ibadah bersama jemaat",
    category: "Ibadah", // Disallowed in events table! Causes Postgres error 42703
    starts_at: "2026-10-24T09:00",
    ends_at: "2026-10-24T12:00",
    status: "published",
    unknown_field_xyz: 123,
  };

  const sanitized = sanitizeSavePayload("events", dirtyEventPayload);
  assert.equal(sanitized.title, "Kebaktian Sabat Istimewa");
  assert.equal(sanitized.summary, "Ibadah bersama jemaat");
  assert.equal("category" in sanitized, false, "events payload must NOT contain category");
  assert.equal("unknown_field_xyz" in sanitized, false);
  assert.equal(sanitized.starts_at, "2026-10-24T09:00:00+08:00");
  assert.equal(sanitized.ends_at, "2026-10-24T12:00:00+08:00");
  assert.equal(sanitized.venue, "GMAHK Rinegetan");
  assert.equal(sanitized.timezone, "Asia/Makassar");
  assert.equal(sanitized.status, "published");
});

test("Reusable mobile-responsive components exist", () => {
  const selectDropdownPath = resolve(
    frontendRoot,
    "src",
    "components",
    "ui",
    "SelectDropdown.tsx"
  );
  assert.ok(existsSync(selectDropdownPath), "SelectDropdown.tsx harus ada");
  const selectContent = readText(selectDropdownPath);
  assert.match(selectContent, /export function SelectDropdown/);

  const dateTimeInputPath = resolve(
    frontendRoot,
    "src",
    "components",
    "ui",
    "DateTimeInput.tsx"
  );
  assert.ok(existsSync(dateTimeInputPath), "DateTimeInput.tsx harus ada");
  const dateTimeContent = readText(dateTimeInputPath);
  assert.match(dateTimeContent, /export function DateTimeInput/);
  assert.match(dateTimeContent, /export function toDateTimeLocalValue/);

  const modalDialogPath = resolve(
    frontendRoot,
    "src",
    "components",
    "ui",
    "ModalDialog.tsx"
  );
  assert.ok(existsSync(modalDialogPath), "ModalDialog.tsx harus ada");
  const modalContent = readText(modalDialogPath);
  assert.match(modalContent, /export function Modal/);
  assert.match(modalContent, /createPortal/);

  const modalBackdropPath = resolve(
    frontendRoot,
    "src",
    "components",
    "ui",
    "modal.ts"
  );
  assert.ok(existsSync(modalBackdropPath), "modal.ts harus ada");
  const backdropContent = readText(modalBackdropPath);
  assert.match(backdropContent, /backdrop-blur-md/, "backdrop must use full blur");
  assert.match(backdropContent, /z-\[100\]/, "backdrop must sit on top of sticky header");
});

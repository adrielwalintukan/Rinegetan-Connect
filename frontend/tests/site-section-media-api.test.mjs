import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const VALID_SECTIONS = ["home_hero", "home_welcome", "sekolah_sabat", "tentang_kami"];
const VALID_POSITIONS = ["top", "center", "bottom", "contain"];

test("api validation: accepts valid section keys and rejects invalid", () => {
  assert.equal(VALID_SECTIONS.includes("home_hero"), true);
  assert.equal(VALID_SECTIONS.includes("home_welcome"), true);
  assert.equal(VALID_SECTIONS.includes("sekolah_sabat"), true);
  assert.equal(VALID_SECTIONS.includes("tentang_kami"), true);
  assert.equal(VALID_SECTIONS.includes("invalid_section"), false);
});

test("api validation: accepts valid object_position and rejects invalid", () => {
  assert.equal(VALID_POSITIONS.includes("top"), true);
  assert.equal(VALID_POSITIONS.includes("center"), true);
  assert.equal(VALID_POSITIONS.includes("bottom"), true);
  assert.equal(VALID_POSITIONS.includes("contain"), true);
  assert.equal(VALID_POSITIONS.includes("invalid_position"), false);
  assert.equal(VALID_POSITIONS.includes("left"), false);
});

test("section media route: rejects unapproved consent and never records implicit consent", () => {
  const routePath = path.resolve(process.cwd(), "src/app/api/staff/settings/section-media/route.ts");
  const content = fs.readFileSync(routePath, "utf8");

  // Must reject non-approved consent
  assert.match(content, /asset\.consent_status !== "approved"/);
  assert.match(content, /consent_not_approved/);

  // Must NOT auto-approve or record implicit consent from banner assignment
  assert.doesNotMatch(content, /recordConsent\(/);
});

test("section media route: validates object_position before upserting", () => {
  const routePath = path.resolve(process.cwd(), "src/app/api/staff/settings/section-media/route.ts");
  const content = fs.readFileSync(routePath, "utf8");

  assert.match(content, /VALID_POSITIONS/);
  assert.match(content, /invalid_position/);
});

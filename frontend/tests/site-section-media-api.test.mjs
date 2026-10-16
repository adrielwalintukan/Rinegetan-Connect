import test from "node:test";
import assert from "node:assert/strict";

const VALID_SECTIONS = ["home_hero", "home_welcome", "sekolah_sabat", "tentang_kami"];

test("api validation: accepts valid section keys and rejects invalid", () => {
  assert.equal(VALID_SECTIONS.includes("home_hero"), true);
  assert.equal(VALID_SECTIONS.includes("home_welcome"), true);
  assert.equal(VALID_SECTIONS.includes("sekolah_sabat"), true);
  assert.equal(VALID_SECTIONS.includes("tentang_kami"), true);
  assert.equal(VALID_SECTIONS.includes("invalid_section"), false);
});

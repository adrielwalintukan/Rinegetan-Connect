import test from "node:test";
import assert from "node:assert/strict";

const VALID_CATEGORIES = ["ibadah", "pemuda", "sekolah_sabat", "sosial", "fellowship", "umum"];

test("category validation: allows valid enum categories and rejects invalid", () => {
  assert.equal(VALID_CATEGORIES.includes("ibadah"), true);
  assert.equal(VALID_CATEGORIES.includes("pemuda"), true);
  assert.equal(VALID_CATEGORIES.includes("hacker"), false);
  assert.equal(VALID_CATEGORIES.includes("unknown"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..");
const designSystemPath = resolve(repositoryRoot, "docs", "02-design", "DESIGN-SYSTEM.md");
const backlogPath = resolve(repositoryRoot, "docs", "04-delivery", "ISSUE-BACKLOG.md");

const designSystem = () => readFileSync(designSystemPath, "utf8");
const backlog = () => readFileSync(backlogPath, "utf8");

test("OPS-FONT records the permanent fallback decision instead of waiting for a licensed file", () => {
  const text = designSystem();
  assert.match(
    text,
    /keputusan permanen/i,
    "design system must state that the fallback is a permanent decision, not a temporary wait",
  );
  assert.match(
    text,
    /Plus Jakarta Sans/,
    "the fallback stack itself must stay documented",
  );
  assert.doesNotMatch(
    text,
    /sampai file Advent Sans berlisensi disediakan organisasi/i,
    "the old 'waiting for the organisation' wording must be replaced by the owner's decision",
  );
});

test("IDEA-DARK stays an idea and is never presented as a planned or shipped feature", () => {
  const text = designSystem();
  assert.match(text, /Dark Sabbath Mode/, "the idea must stay named so it is not silently dropped");
  assert.match(
    text,
    /tidak dibangun|bukan requirement|ditahan/i,
    "the design system must say the idea is not built",
  );
  assert.doesNotMatch(
    text,
    /akan diimplementasikan|masuk sprint|dijadwalkan implementasi/i,
    "nothing may promise implementation",
  );
});

test("the backlog carries both owner decisions with their dates", () => {
  const text = backlog();
  assert.match(text, /OPS-FONT/, "the backlog must record the font decision");
  assert.match(text, /IDEA-DARK/, "the backlog must record the dark mode decision");
  assert.match(
    text,
    /2026-11-17/,
    "the decisions must carry the date they were taken",
  );
});

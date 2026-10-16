import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(resolve(frontendRoot, path), "utf8");
const listFiles = (dir) =>
  readdirSync(resolve(frontendRoot, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );
const publicSources = [...listFiles("src/components"), "src/data/content.js"].filter((f) => /\.(jsx|tsx|js)$/.test(f));

test("public site carries no invented local facts or internal project jargon", () => {
  for (const file of publicSources) {
    const source = read(file);
    assert.doesNotMatch(source, /Rantung|Kolom Ketujuh|ruang henti|Fase [0-9]|Rinegetan Connect —/, file);
    assert.doesNotMatch(source, /telah kami terima/, `${file}: forms must not claim delivery`);
  }
  const content = read("src/data/content.js");
  assert.doesNotMatch(content, /export const (EVENTS|MEDIA_ITEMS|DEPARTMENTS) =/);
  assert.doesNotMatch(content, /812-3456-7890|halo@gmahkrinegetan\.org/);
});

test("staff portal uses the official symbol and a single-row tab bar", () => {
  const dashboard = read("src/components/staff/StaffDashboard.tsx");
  assert.match(dashboard, /<AdventistSymbol/);
  assert.doesNotMatch(dashboard, /<Shield /);
  assert.match(dashboard, /flex-nowrap[^"]*overflow-x-auto/);
  for (const page of ["login", "forgot-password", "update-password"]) {
    assert.match(read(`src/app/staff/${page}/page.tsx`), /<AdventistSymbol/, page);
  }
});

test("staff dialogs are bottom sheets on phones and tables become cards", () => {
  assert.match(read("src/components/ui/modal.ts"), /items-end[^"]*sm:items-center/);
  assert.match(read("src/components/staff/ContentTable.tsx"), /hidden[^"]*md:table-header-group/);
});

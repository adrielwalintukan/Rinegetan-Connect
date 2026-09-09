import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const pageFiles = [
  "src/app/(public)/layout.tsx",
  "src/app/(public)/page.tsx",
  "src/app/(public)/tentang-kami/page.tsx",
  "src/app/(public)/kegiatan/page.tsx",
  "src/app/(public)/media/page.tsx",
  "src/app/(public)/pelayanan/page.tsx",
  "src/app/(public)/sekolah-sabat/page.tsx",
  "src/app/(public)/kontak/page.tsx",
];

test("all Phase 1 public URLs have App Router source files", () => {
  for (const relativePath of pageFiles) {
    const filePath = join(projectRoot, relativePath);
    assert.ok(existsSync(filePath), `Rute App Router belum ada: ${relativePath}`);
    assert.match(readFileSync(filePath, "utf8"), /export default/);
  }
});

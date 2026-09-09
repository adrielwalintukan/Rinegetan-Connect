import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const supabaseRoot = join(frontendRoot, "..", "supabase");
const requiredPaths = [
  "README.md",
  "migrations/.gitkeep",
  "tests/.gitkeep",
  "functions/.gitkeep",
];

test("Supabase source-control boundary is present without project credentials", () => {
  for (const relativePath of requiredPaths) {
    assert.ok(
      existsSync(join(supabaseRoot, relativePath)),
      `Batas Supabase belum ada: supabase/${relativePath}`,
    );
  }

  const readme = readFileSync(join(supabaseRoot, "README.md"), "utf8");
  assert.match(readme, /tidak menerapkan migrasi remote/i);
  assert.match(readme, /jangan commit.*service-role/i);
});

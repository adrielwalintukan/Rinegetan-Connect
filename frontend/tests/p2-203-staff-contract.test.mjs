import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");

const readText = (path) => readFileSync(path, "utf8");

test("P2-203 local Auth disables public signup", () => {
  const config = readText(resolve(repositoryRoot, "supabase", "config.toml"));
  const authSection = config.match(/^\[auth\][\s\S]*?(?=\r?\n\[)/m)?.[0] ?? "";
  const emailSection =
    config.match(/^\[auth\.email\][\s\S]*?(?=\r?\n\[)/m)?.[0] ?? "";

  assert.match(authSection, /^enable_signup\s*=\s*false\s*$/m);
  assert.match(emailSection, /^enable_signup\s*=\s*false\s*$/m);
});

test("P2-203 environment contract keeps server credentials blank and private", () => {
  const environmentExample = readText(resolve(frontendRoot, ".env.example")).trim();

  assert.deepEqual(environmentExample.split(/\r?\n/), [
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
    "SUPABASE_URL=",
    "SUPABASE_SECRET_KEY=",
  ]);
  assert.doesNotMatch(environmentExample, /=.+$/m);
  assert.doesNotMatch(environmentExample, /SERVICE_ROLE|DATABASE_URL|supabase\.co/i);
});

test("P2-203 admin client is a server-only boundary", () => {
  const adminModule = resolve(
    frontendRoot,
    "src",
    "lib",
    "supabase",
    "admin.ts",
  );
  assert.ok(existsSync(adminModule), "Supabase admin module must exist");

  const source = readText(adminModule);
  assert.match(source, /createSupabaseAdminClient/);
  assert.match(source, /SUPABASE_URL/);
  assert.match(source, /SUPABASE_SECRET_KEY/);
  assert.match(source, /autoRefreshToken:\s*false/);
  assert.match(source, /persistSession:\s*false/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  assert.doesNotMatch(source, /SERVICE_ROLE|service_role/i);
});

test("P2-203 browser and SSR public clients do not import the admin secret", () => {
  for (const relativePath of [
    "src/lib/supabase/browser.ts",
    "src/lib/supabase/server.ts",
  ]) {
    const source = readText(resolve(frontendRoot, relativePath));
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(source, /createSupabaseAdminClient/);
  }
});

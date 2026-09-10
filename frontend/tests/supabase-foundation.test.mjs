import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");

const readText = (path) => readFileSync(path, "utf8");

test("Supabase dependencies are pinned to the approved versions", () => {
  const packageJson = JSON.parse(readText(resolve(frontendRoot, "package.json")));

  assert.equal(packageJson.dependencies["@supabase/supabase-js"], "2.116.0");
  assert.equal(packageJson.dependencies["@supabase/ssr"], "0.12.7");
  assert.equal(packageJson.devDependencies.supabase, "2.117.0");
  assert.equal(packageJson.scripts.supabase, "supabase --workdir ..");
});

test("public Supabase environment example contains only blank public values", () => {
  const environmentExample = resolve(frontendRoot, ".env.example");

  assert.ok(existsSync(environmentExample), "frontend/.env.example must exist");

  const source = readText(environmentExample).trim();
  assert.deepEqual(source.split(/\r?\n/), [
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
  ]);
  assert.doesNotMatch(source, /SERVICE_ROLE|DATABASE_URL|kjxkmmjumrpafdublrbk|supabase\.co/i);
  assert.doesNotMatch(source, /=.+$/m);
});

test("Supabase CLI metadata is ignored while the public template is tracked", () => {
  const gitignore = readText(resolve(repositoryRoot, ".gitignore"));

  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^supabase\/\.temp\/$/m);
  assert.match(gitignore, /^\.supabase\/$/m);
});

test("repository has versioned local Supabase CLI configuration", () => {
  assert.ok(
    existsSync(resolve(repositoryRoot, "supabase", "config.toml")),
    "supabase/config.toml must exist",
  );
});

test("Supabase browser and server boundaries are separate and contain no privileged key", () => {
  const environmentModule = resolve(frontendRoot, "src", "lib", "supabase", "environment.ts");
  const browserModule = resolve(frontendRoot, "src", "lib", "supabase", "browser.ts");
  const serverModule = resolve(frontendRoot, "src", "lib", "supabase", "server.ts");

  for (const modulePath of [environmentModule, browserModule, serverModule]) {
    assert.ok(existsSync(modulePath), `${modulePath} must exist`);
    assert.doesNotMatch(readText(modulePath), /SERVICE_ROLE|service_role/i);
  }

  assert.match(readText(environmentModule), /getSupabasePublicEnvironment/);
  assert.match(readText(browserModule), /createBrowserClient/);
  assert.match(readText(browserModule), /createBrowserSupabaseClient/);
  assert.match(readText(serverModule), /createServerClient/);
  assert.match(readText(serverModule), /next\/headers/);
  assert.match(readText(serverModule), /createServerSupabaseClient/);
});

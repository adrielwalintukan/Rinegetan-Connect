import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");
const require = createRequire(import.meta.url);
const validationPath = resolve(frontendRoot, "src", "lib", "staff", "validation.js");

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

test("staff validation module is loadable and trims valid invite input", () => {
  let validation;
  assert.doesNotThrow(() => {
    validation = require(validationPath);
  });

  assert.deepEqual(
    validation.parseInviteEditorPayload({
      email: "  editor@example.com ",
      displayName: "  Editor Rinegetan  ",
    }),
    { email: "editor@example.com", displayName: "Editor Rinegetan" },
  );
});

test("staff validation rejects invalid invite input with a stable code", () => {
  const { parseInviteEditorPayload } = require(validationPath);
  const invalidPayloads = [
    null,
    {},
    { email: "", displayName: "Editor" },
    { email: "not-an-email", displayName: "Editor" },
    { email: "editor@example.com", displayName: "" },
    { email: "editor@example.com", displayName: "x".repeat(121) },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(
      () => parseInviteEditorPayload(payload),
      (error) => error?.code === "validation_error",
    );
  }
});

test("staff validation trims valid deactivation input", () => {
  const { parseDeactivatePayload } = require(validationPath);

  assert.deepEqual(
    parseDeactivatePayload({
      userId: "  66666666-6666-4666-8666-666666666666 ",
      reason: "  Rotasi tugas  ",
    }),
    {
      userId: "66666666-6666-4666-8666-666666666666",
      reason: "Rotasi tugas",
    },
  );
});

test("staff validation rejects invalid deactivation input", () => {
  const { parseDeactivatePayload } = require(validationPath);
  const invalidPayloads = [
    null,
    { userId: "not-a-uuid", reason: "Rotasi" },
    { userId: "66666666-6666-6666-6666-666666666666", reason: "" },
    {
      userId: "66666666-6666-6666-6666-666666666666",
      reason: "x".repeat(241),
    },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(
      () => parseDeactivatePayload(payload),
      (error) => error?.code === "validation_error",
    );
  }
});

test("staff server service verifies the current user and active Admin role", () => {
  const serverModule = resolve(frontendRoot, "src", "lib", "staff", "server.ts");

  assert.ok(existsSync(serverModule), "staff server service must exist");

  const source = readText(serverModule);
  assert.match(source, /requireActiveAdmin/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /from\("staff_roles"\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /role.*admin/);
  assert.match(source, /is_active/);
});

test("staff invitation route owns the server-only invite and compensation flow", () => {
  const routePath = resolve(
    frontendRoot,
    "src",
    "app",
    "api",
    "staff",
    "invite-editor",
    "route.ts",
  );

  assert.ok(existsSync(routePath), "invite-editor route must exist");

  const source = readText(routePath);
  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /parseInviteEditorPayload/);
  assert.match(source, /requireActiveAdmin/);
  assert.match(source, /createSupabaseAdminClient/);
  assert.match(source, /auth\.admin\.inviteUserByEmail/);
  assert.match(source, /provision_invited_editor/);
  assert.match(source, /auth\.admin\.deleteUser/);
  assert.match(source, /status:\s*201/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});

test("staff deactivation route delegates to the guarded lifecycle RPC", () => {
  const routePath = resolve(
    frontendRoot,
    "src",
    "app",
    "api",
    "staff",
    "deactivate",
    "route.ts",
  );

  assert.ok(existsSync(routePath), "deactivate route must exist");

  const source = readText(routePath);
  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /parseDeactivatePayload/);
  assert.match(source, /requireActiveAdmin/);
  assert.match(source, /rpc\("deactivate_staff"/);
  assert.match(source, /status:\s*204/);
  assert.doesNotMatch(source, /createSupabaseAdminClient/);
});

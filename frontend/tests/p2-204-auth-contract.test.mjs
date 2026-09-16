import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");
const require = createRequire(import.meta.url);
const redirectPath = resolve(frontendRoot, "src", "lib", "auth", "redirect.js");
const readText = (path) => readFileSync(path, "utf8");

test("P2-204 safeNextPath accepts internal path and rejects open redirects", () => {
  const { safeNextPath } = require(redirectPath);
  assert.equal(safeNextPath("/staff/settings"), "/staff/settings");
  assert.equal(safeNextPath("//evil.example"), "/staff");
  assert.equal(safeNextPath("https://evil.example"), "/staff");
  assert.equal(safeNextPath("javascript:alert(1)"), "/staff");
  assert.equal(safeNextPath(""), "/staff");
});

test("P2-204 route classifier leaves Auth pages public and protects staff pages", () => {
  const { isPublicAuthPath, isProtectedStaffPath } = require(redirectPath);
  for (const path of ["/staff/login", "/staff/forgot-password", "/auth/callback"]) {
    assert.equal(isPublicAuthPath(path), true, path);
  }
  assert.equal(isProtectedStaffPath("/staff"), true);
  assert.equal(isProtectedStaffPath("/staff/admin"), true);
  assert.equal(isProtectedStaffPath("/"), false);
});

test("P2-204 redirect helper is not an admin-secret boundary", () => {
  assert.ok(existsSync(redirectPath));
  const source = readText(redirectPath);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|createSupabaseAdminClient/);
});

test("P2-204 local Auth keeps public signup disabled", () => {
  const config = readText(resolve(repositoryRoot, "supabase", "config.toml"));
  assert.match(config, /^enable_signup\s*=\s*false\s*$/m);
});

test("P2-204 proxy owns SSR cookie refresh and optimistic staff redirect", () => {
  const proxyPath = resolve(frontendRoot, "src", "proxy.ts");
  const helperPath = resolve(frontendRoot, "src", "lib", "supabase", "proxy.ts");
  assert.ok(existsSync(proxyPath));
  assert.ok(existsSync(helperPath));
  const source = `${readText(proxyPath)}\n${readText(helperPath)}`;
  assert.match(source, /createServerClient/);
  assert.match(source, /getClaims\(\)/);
  assert.match(source, /NextResponse\.redirect/);
  assert.match(source, /request\.cookies/);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|createSupabaseAdminClient|getSession\(\)/);
});

test("P2-204 proxy matcher excludes static assets and API", () => {
  const source = readText(resolve(frontendRoot, "src", "proxy.ts"));
  assert.match(source, /matcher/);
  assert.match(source, /_next/);
  assert.match(source, /api/);
});

test("P2-204 staff server guard verifies Auth user plus active database role", () => {
  const source = readText(resolve(frontendRoot, "src", "lib", "staff", "server.ts"));
  assert.match(source, /requireActiveStaff/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /role.*admin.*editor|admin.*editor.*role/s);
  assert.match(source, /is_active/);
});

test("P2-204 protected landing and logout are server boundaries", () => {
  const layout = readText(
    resolve(frontendRoot, "src", "app", "staff", "(protected)", "layout.tsx"),
  );
  const signout = readText(
    resolve(frontendRoot, "src", "app", "auth", "signout", "route.ts"),
  );
  assert.match(layout, /requireActiveStaff/);
  assert.match(layout, /redirect/);
  assert.match(signout, /export\s+async\s+function\s+POST/);
  assert.match(signout, /auth\.signOut\(\)/);
  assert.doesNotMatch(`${layout}${signout}`, /SUPABASE_SECRET_KEY|createSupabaseAdminClient/);
});

test("P2-204 callback exchanges code and never trusts an external next URL", () => {
  const path = resolve(frontendRoot, "src", "app", "auth", "callback", "route.ts");
  assert.ok(existsSync(path));
  const source = readText(path);
  assert.match(source, /export\s+async\s+function\s+GET/);
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /safeNextPath/);
  assert.doesNotMatch(
    source,
    /console\.(log|error).*code|searchParams\.get\("code"\).*Response/,
  );
});

test("P2-204 invitation route supplies callback redirect without secret exposure", () => {
  const source = readText(
    resolve(frontendRoot, "src", "app", "api", "staff", "invite-editor", "route.ts"),
  );
  assert.match(source, /redirectTo/);
  assert.match(source, /auth\.callback|auth\/callback/);
  assert.match(source, /update-password/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});

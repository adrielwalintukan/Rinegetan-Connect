import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const routeUrl = new URL("src/app/api/staff/media/album-download/route.ts", root);
const albumId = "71800000-0000-4000-8000-000000000001";
const staffId = "71800000-0000-4000-8000-00000000000e";
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const transpile = (url) => ts.transpileModule(readFileSync(url, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function loadRoute() {
  assert.ok(existsSync(routeUrl), "Album download API route must exist");
  const imports = {
    "@/lib/supabase/server": dataUrl("export const createServerSupabaseClient = async () => globalThis.__albumToggleTest.client;"),
    "@/lib/staff/server": dataUrl(transpile(new URL("src/lib/staff/server.ts", root))),
    "@/lib/media/album-download": new URL("src/lib/media/album-download.mjs", root).href,
    "@/lib/api/errors": new URL("src/lib/api/errors.mjs", root).href,
    "@/lib/public/queries": dataUrl("export const triggerPublicRevalidation = async (entity) => { globalThis.__albumToggleTest.revalidated.push(entity); };"),
  };
  const source = transpile(routeUrl).replace(/(from\s+["'])([^"']+)(["'])/g,
    (match, before, specifier, after) => imports[specifier] ? `${before}${imports[specifier]}${after}` : match);
  return import(dataUrl(source));
}

function database({ role = "editor", active = true, error = null } = {}) {
  const updates = [];
  const client = {
    auth: { async getUser() { return { data: { user: role ? { id: staffId } : null }, error: null }; } },
    from(table) {
      if (table === "staff_roles" || table === "profiles") return {
        select() { return { eq() { return { async maybeSingle() {
          return { data: table === "staff_roles" ? { role } : { is_active: active }, error: null };
        } }; } }; },
      };
      assert.equal(table, "media_albums");
      return { update(payload) {
        updates.push(payload);
        return { eq(column, id) {
          assert.equal(column, "id"); assert.equal(id, albumId);
          return { select() { return { async single() {
            return { data: error ? null : { id: albumId, title: "Album uji", status: "published", ...payload }, error };
          } }; } };
        } };
      } };
    },
  };
  return { client, updates };
}

async function post(body, options) {
  const route = await loadRoute();
  const db = database(options);
  const revalidated = [];
  globalThis.__albumToggleTest = { client: db.client, revalidated };
  try {
    const response = await route.POST(new Request("http://localhost/api/staff/media/album-download", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json(), updates: db.updates, revalidated };
  } finally { delete globalThis.__albumToggleTest; }
}

test("an active Editor changes only the album download flag and actor, then revalidates", async () => {
  const result = await post({ albumId, enabled: true, status: "published", title: "Injected title" });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.public_download_enabled, true);
  assert.deepEqual(result.updates, [{ public_download_enabled: true, updated_by: staffId }]);
  assert.deepEqual(result.revalidated, ["media_albums"]);
});

test("an Admin can disable album downloads", async () => {
  const result = await post({ albumId, enabled: false }, { role: "admin" });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.public_download_enabled, false);
});

for (const [label, options, expectedStatus] of [
  ["anonymous", { role: null }, 401],
  ["inactive Editor", { role: "editor", active: false }, 403],
  ["non-staff account", { role: "member" }, 403],
]) {
  test(`${label} cannot change the album flag`, async () => {
    const result = await post({ albumId, enabled: true }, options);
    assert.equal(result.status, expectedStatus);
    assert.deepEqual(result.updates, []);
    assert.deepEqual(result.revalidated, []);
  });
}

for (const enabled of ["true", null, 1]) {
  test(`invalid enabled value ${JSON.stringify(enabled)} never reaches the album update`, async () => {
    const result = await post({ albumId, enabled });
    assert.equal(result.status, 400);
    assert.deepEqual(result.updates, []);
  });
}

test("an invalid album identifier is rejected before an update", async () => {
  const result = await post({ albumId: "not-a-uuid", enabled: true });
  assert.equal(result.status, 400);
  assert.deepEqual(result.updates, []);
});

test("a missing album returns 404 and never revalidates", async () => {
  const result = await post({ albumId, enabled: true }, { error: { code: "PGRST116", message: "private query details" } });
  assert.equal(result.status, 404);
  assert.deepEqual(result.revalidated, []);
  assert.doesNotMatch(JSON.stringify(result.body), /private query details/);
});

test("database failures return a friendly response instead of internal details", async () => {
  const result = await post({ albumId, enabled: true }, { error: { code: "42501", message: "private query details" } });
  assert.equal(result.status, 500);
  assert.deepEqual(result.revalidated, []);
  assert.doesNotMatch(JSON.stringify(result.body), /private query details/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as core from "../src/lib/sabbath/adventech.mjs";
import * as catalog from "../src/lib/sabbath/catalog.mjs";

const source = readFileSync(new URL("../src/lib/sabbath/server.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source + "\nexport { fetchQuarterlyFromAdventech };", { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const server = {};
new Function("require", "exports", compiled)((id) => {
  if (id === "server-only") return {};
  if (id === "next/cache") return { unstable_cache: (fn) => fn };
  if (id === "./catalog.mjs") return catalog;
  if (id === "@/lib/supabase/server") return { createServerSupabaseClient: async () => { throw new Error("must not connect"); } };
  if (id === "./adventech.mjs") return core;
  throw new Error("Unexpected import");
}, server);
const { fetchQuarterlyFromAdventech } = server;

test("uses the official fixed Indonesian endpoint without redirects and preserves source version", async () => {
  let request;
  const result = await fetchQuarterlyFromAdventech("2026-01", async (url, options) => {
    request = { url, options };
    return new Response('{"synthetic":true}', { headers: { "content-type": "application/json", etag: '"v1"' } });
  });
  assert.equal(request.url, "https://sabbath-school.adventech.io/api/v2/in/quarterlies/2026-01/index.json");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.cache, "no-store");
  assert.deepEqual(result, { payload: { synthetic: true }, sourceVersion: '"v1"', etag: '"v1"' });
});

test("rejects untrusted identifiers before sending any request", async () => {
  for (const id of ["../secret", "2026-05", "2026-01/../../", "2026-01?x=y", "https://example.invalid"]) {
    await assert.rejects(fetchQuarterlyFromAdventech(id, () => { throw new Error("request made"); }), /Invalid/);
  }
});

test("rejects unsuccessful, wrong type, unversioned and oversized responses", async () => {
  const responses = [
    () => new Response("error", { status: 500 }),
    () => new Response("{}", { headers: { "content-type": "text/html", etag: '"v1"' } }),
    () => new Response("{}", { headers: { "content-type": "application/json" } }),
    () => new Response("x".repeat(2_097_153), { headers: { "content-type": "application/json", etag: '"v1"' } }),
  ];
  for (const response of responses) await assert.rejects(fetchQuarterlyFromAdventech("2026-01", async () => response()));
});

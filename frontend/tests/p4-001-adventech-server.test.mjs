import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as core from "../src/lib/sabbath/adventech.mjs";

test("server entry remains closed and makes no source request", async () => {
  const source = readFileSync(new URL("../src/lib/sabbath/server.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let requests = 0;
  let connections = 0;
  const exports = {};
  const load = (id) => {
    if (id === "server-only") return {};
    if (id === "@/lib/supabase/server") return { createServerSupabaseClient: async () => { connections++; throw new Error("must not connect"); } };
    if (id === "./adventech.mjs") return core;
    throw new Error("Unexpected import");
  };
  new Function("require", "exports", "fetch", compiled)(load, exports, async () => { requests++; throw new Error("must not fetch"); });
  assert.equal(Object.hasOwn(exports, "fetchQuarterlyFromAdventech"), false);
  assert.deepEqual(await exports.loadSabbathQuarterly("2026-01"), { status: "unavailable" });
  assert.equal(requests, 0);
  assert.equal(connections, 0);
});

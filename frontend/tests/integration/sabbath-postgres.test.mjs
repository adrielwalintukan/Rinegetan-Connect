import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { fixture, settings } from "../helpers/local-course-fixture.mjs";
import { createPostgresCache } from "../../src/lib/sabbath/adventech.mjs";

test("real local PostgREST reaches PostgreSQL and rejects cache access while rights are closed", async () => {
  const config = settings(); // Checks loopback, project identity and the disposable local container.
  const local = await fixture(config.API_URL);
  try {
    for (const role of ["anon", "editor", "admin"]) {
      let token = config.ANON_KEY;
      if (role !== "anon") {
        await local.login({ addCookies: async ([cookie]) => {
          token = JSON.parse(Buffer.from(cookie.value.slice("base64-".length), "base64url").toString()).access_token;
        } }, role);
      }
      const client = createClient(config.API_URL, config.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const health = await client.from("courses").select("id").limit(1);
      assert.equal(health.error, null, `${role}: PostgREST must be reachable`);
      const result = await client.rpc("sabbath_cache_read", { p_source_id: "id-2026-01" });
      assert.equal(result.error?.code, "42501", `${role}: database permission denial, not a transport error`);
      if (role !== "anon") assert.equal(result.error.message, "sabbath_cache_unavailable");
      const cache = createPostgresCache(client);
      await assert.rejects(cache.readCache("id-2026-01"), /Cache unavailable/);
      await assert.rejects(cache.writeCache({ sourceId: "id-2026-01", sourceVersion: "synthetic-v1",
        fetchedAt: "2026-01-01T00:00:00.000Z", etag: null, payload: {} }), /Cache unavailable/);
    }
  } finally {
    local.cleanup();
  }
});

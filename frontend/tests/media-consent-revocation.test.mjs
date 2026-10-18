import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const { recordConsent } = await loadTypeScript("src/lib/media/consent.ts");

function consentDatabase({ subject = "child", status = "published", evidenceError = null } = {}) {
  const row = { id: "asset-1", subject_age_group: subject, status, consent_status: "approved" };
  const writes = [];
  const client = {
    from(table) {
      if (table === "consent_records") return {
        async insert(record) { writes.push({ table, record }); return { error: evidenceError }; },
      };
      assert.equal(table, "media_assets");
      return {
        update(payload) {
          writes.push({ table, payload });
          return { eq(column, id) {
            assert.equal(column, "id"); assert.equal(id, row.id);
            return { select() { return { async single() {
              const next = { ...row, ...payload };
              // The real media_assets_child_consent_check applies to each UPDATE, not the final route state.
              if (next.subject_age_group === "child" && next.status === "published" && next.consent_status !== "approved") {
                return { data: null, error: { code: "23514", message: "child consent constraint" } };
              }
              Object.assign(row, next);
              return { data: { ...row }, error: null };
            } }; } };
          } };
        },
      };
    },
  };
  return { client, row, writes };
}

for (const nextConsent of ["pending", "rejected", "revoked"]) {
  test(`published child photo becomes draft in the same asset update as ${nextConsent} consent`, async () => {
    const db = consentDatabase();
    const result = await recordConsent(db.client, db.row, nextConsent, "staff-1");
    assert.equal(result.error, null);
    assert.equal(result.data.status, "draft");
    assert.equal(result.data.consent_status, nextConsent);
    assert.equal(db.writes[0].table, "consent_records");
    assert.equal(db.writes[0].record.consent_status, nextConsent);
    assert.equal(db.writes[1].payload.status, "draft");
    assert.equal(db.writes.length, 2);
  });
}

test("failed consent evidence leaves the asset untouched", async () => {
  const error = { code: "42501" };
  const db = consentDatabase({ evidenceError: error });
  const result = await recordConsent(db.client, db.row, "revoked", "staff-1");
  assert.equal(result.error, error);
  assert.equal(db.row.status, "published");
  assert.equal(db.row.consent_status, "approved");
  assert.equal(db.writes.length, 1);
});

test("approving an existing draft never publishes it implicitly", async () => {
  const db = consentDatabase({ status: "draft" });
  const result = await recordConsent(db.client, db.row, "approved", "staff-1");
  assert.equal(result.error, null);
  assert.equal(result.data.status, "draft");
});

test("revoking general-photo consent also returns a published photo to draft", async () => {
  const db = consentDatabase({ subject: "general" });
  const result = await recordConsent(db.client, db.row, "revoked", "staff-1");
  assert.equal(result.error, null);
  assert.equal(result.data.status, "draft");
});

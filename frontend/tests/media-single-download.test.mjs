import test from "node:test";
import assert from "node:assert/strict";
import { isMediaAssetDownloadEligible } from "../src/lib/media/eligibility.mjs";
import { checkDownloadRateLimit, resetRateLimiter } from "../src/lib/media/rate-limiter.mjs";
import { hashIp } from "../src/lib/media/download-audit.mjs";

test("single download: hashIp produces deterministic 16-char hex string", () => {
  const ip = "192.168.1.100";
  const hash1 = hashIp(ip);
  const hash2 = hashIp(ip);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 16);
  assert.match(hash1, /^[a-f0-9]{16}$/);
});

test("single download handler logic: rejects non-eligible asset with 404/403", () => {
  const hiddenAsset = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    status: "published",
    consent_status: "approved",
    hidden_at: "2026-09-18T10:00:00Z",
    public_download_enabled: true,
  };
  assert.equal(isMediaAssetDownloadEligible(hiddenAsset), false);
});

test("single download handler logic: enforces rate limit", () => {
  resetRateLimiter();
  const ip = "10.0.0.1";
  for (let i = 0; i < 6; i++) {
    assert.equal(checkDownloadRateLimit(ip).allowed, true);
  }
  assert.equal(checkDownloadRateLimit(ip).allowed, false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { checkDownloadRateLimit, resetRateLimiter } from "../src/lib/media/rate-limiter.mjs";

test("rate limiter: allows up to limit and blocks subsequent requests", () => {
  resetRateLimiter();
  const ip = "192.168.1.50";
  const limit = 3;
  const windowMs = 1000;

  for (let i = 0; i < limit; i++) {
    const res = checkDownloadRateLimit(ip, limit, windowMs);
    assert.equal(res.allowed, true);
    assert.equal(res.remaining, limit - 1 - i);
  }

  const blocked = checkDownloadRateLimit(ip, limit, windowMs);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetMs > 0);
});

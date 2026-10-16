interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const DEFAULT_DOWNLOAD_RATE_LIMIT = 6;
export const DEFAULT_DOWNLOAD_WINDOW_MS = 60 * 1000; // 60 seconds

export function checkDownloadRateLimit(
  ip: string,
  limit: number = DEFAULT_DOWNLOAD_RATE_LIMIT,
  windowMs: number = DEFAULT_DOWNLOAD_WINDOW_MS
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { timestamps: [] };

  // Filter timestamps within sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldestTimestamp));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(ip, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}

export function resetRateLimiter(): void {
  rateLimitStore.clear();
}

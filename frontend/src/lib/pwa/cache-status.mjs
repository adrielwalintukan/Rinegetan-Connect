// P5-002: how old is the copy of a page this browser is showing?
//
// A public page is network-first, so its stored copy is always the one fetched on the visitor's last
// online visit. Someone who has not opened the site for three days reads a three-day-old page while
// offline, and until now nothing said so. These functions turn a stored timestamp into one of four
// answers, kept pure so the wording and the thresholds can be tested without a browser.

/**
 * Stamped onto the stored copy when it is fetched, so its age is known later. Not sent to the
 * page: the worker stores a modified clone and returns the original response untouched.
 */
export const CACHED_AT_HEADER = "X-Rinegetan-Cached-At";

/** Worker message that asks for the stored timestamp of one path. */
export const CACHE_STATUS_MESSAGE = "CACHE_STATUS";

/**
 * Under this age there is nothing worth saying. The page a visitor loads online is stamped as it is
 * fetched, so its age is a fraction of a second; a notice there would appear on every single visit
 * and train people to ignore it.
 */
export const RECENT_MS = 5 * 60 * 1000;

/** The owner's threshold: past a day, a stored page is presented as old, not merely saved. */
export const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * @param {{ cachedAt?: string | null, now?: number }} input
 * @returns {"unknown" | "recent" | "saved" | "stale"}
 */
export function cacheAgeState(input) {
  const cachedAt = input?.cachedAt;
  if (typeof cachedAt !== "string") return "unknown";
  const stamp = Date.parse(cachedAt);
  if (Number.isNaN(stamp)) return "unknown";

  const now = typeof input?.now === "number" ? input.now : Date.now();
  const age = now - stamp;
  // A stamp in the future means the device clock moved backwards. The age cannot be trusted, so the
  // copy is treated as old rather than as fresh: understating staleness is the worse mistake.
  if (age < 0) return "stale";
  if (age < RECENT_MS) return "recent";
  if (age < STALE_MS) return "saved";
  return "stale";
}

/**
 * Indonesian relative age, coarse on purpose: the visitor needs to know whether they are reading
 * something from today or something from last week, not the exact minute.
 * @param {{ cachedAt?: string | null, now?: number }} input
 * @returns {string | null}
 */
export function describeAge(input) {
  const cachedAt = input?.cachedAt;
  if (typeof cachedAt !== "string") return null;
  const stamp = Date.parse(cachedAt);
  if (Number.isNaN(stamp)) return null;

  const now = typeof input?.now === "number" ? input.now : Date.now();
  const age = now - stamp;
  if (age < 0) return null;

  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "kemarin" : `${days} hari lalu`;
}

/**
 * The line shown above the page. `null` means show nothing at all.
 * @param {{ cachedAt?: string | null, now?: number }} input
 * @returns {string | null}
 */
export function storedCopyNotice(input) {
  const state = cacheAgeState(input);
  if (state === "unknown" || state === "recent") return null;

  const age = describeAge(input);
  if (state === "stale") {
    return "Salinan lama — isinya mungkin sudah berubah. Sambungkan internet lalu perbarui.";
  }
  return age ? `Salinan tersimpan · diperbarui ${age}.` : "Salinan tersimpan.";
}

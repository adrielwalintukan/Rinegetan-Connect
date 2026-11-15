// One source of truth for the offline application shell. `scripts/generate-sw.mjs` turns this into
// public/sw.js, and the tests compare the committed worker against this module, so the cache list
// can never drift from the policy that is actually tested.

/**
 * Pages that may be served from cache while offline.
 *
 * Only statically rendered public pages are here. The Sabbath reader and `/pelajari-alkitab` are
 * rendered per request and carry material whose offline use is still gated by P4-005, so caching
 * them would grant an offline copy of content that has no permission yet.
 */
export const SHELL_ROUTES = [
  "/",
  "/tentang-kami",
  "/kegiatan",
  "/pelayanan",
  "/media",
  "/kontak",
  "/offline",
];

/**
 * Assets that are identical for the whole build and safe to keep until the build id changes.
 * `_next/static` filenames carry a content hash, so a stale entry can never shadow a new file.
 */
export const SHELL_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-icon-180.png",
  "/icon.svg",
];

/**
 * Paths that must never be written to a cache, whatever the request looks like.
 *
 * This is a deny list rather than an allow list because the cost of the two failures is not
 * symmetric: a missing cached page is a slow page, while a cached staff or API response is a
 * privacy incident that survives until the cache is cleared.
 */
export const FORBIDDEN_PREFIXES = [
  "/staff",
  "/api",
  "/auth",
  "/sekolah-sabat",
  "/pelajari-alkitab",
];

/** @param {string} pathname */
export function isForbiddenPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return true;
  return FORBIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** @param {string} pathname */
export function isShellRoute(pathname) {
  return SHELL_ROUTES.includes(pathname);
}

/**
 * Cache name is derived from the build id. Two builds never share a cache, so activation can
 * delete everything that is not the current name without guessing which entries are stale.
 * @param {string} buildId
 */
export function cacheName(buildId) {
  if (typeof buildId !== "string" || !/^[0-9a-z]{1,40}$/i.test(buildId)) {
    throw new Error(`Invalid build id: ${String(buildId)}`);
  }
  return `rinegetan-shell-${buildId}`;
}

/**
 * Decides how a request is answered.
 *
 * - `bypass`: never touch the cache (forbidden paths, non-GET, cross-origin, API).
 * - `cache-first`: hashed build assets, which cannot go stale within a build.
 * - `network-first`: HTML, so a published change is visible immediately and the cache is only a
 *   fallback when the network fails.
 * @param {{ method?: string, mode?: string, url: string }} request
 * @param {string} origin
 * @returns {"bypass" | "cache-first" | "network-first"}
 */
export function strategyFor(request, origin) {
  const method = request?.method ?? "GET";
  if (method !== "GET") return "bypass";

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }
  if (url.origin !== origin) return "bypass";
  if (isForbiddenPath(url.pathname)) return "bypass";
  if (url.pathname.startsWith("/_next/static/")) return "cache-first";
  if (SHELL_ASSETS.includes(url.pathname)) return "cache-first";
  // Only whole-page navigations are cached; a fetch() to the same URL is not a shell request.
  if (request.mode === "navigate" && isShellRoute(url.pathname)) return "network-first";
  return "bypass";
}

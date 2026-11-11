import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPostgresCache, refreshQuarterly } from "./adventech.mjs";
import { unstable_cache } from "next/cache";
import { selectActiveAdultQuarter, selectSabbathCatalog } from "./catalog.mjs";
import { normalizeReaderLesson, normalizeReaderDay } from "./reader.mjs";

async function fetchQuarterlyFromAdventech(quarterId: string, fetcher: typeof fetch = fetch) {
  if (typeof quarterId !== "string" || !/^\d{4}-0[1-4](?:-[a-z0-9]+)?$/.test(quarterId)) {
    throw new Error("Invalid quarterly identifier");
  }
  return fetchAdventechJson(`${quarterId}/index.json`, fetcher);
}

async function fetchAdventechJson(path: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(
    `https://sabbath-school.adventech.io/api/v2/in/quarterlies/${path}`,
    { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") || "") || !response.body) {
    throw new Error("Invalid upstream response");
  }
  const etag = response.headers.get("etag");
  const sourceVersion = (etag || response.headers.get("last-modified") || "").trim();
  if (!sourceVersion) throw new Error("Invalid source version");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2_097_152) { await reader.cancel(); throw new Error("Upstream response too large"); }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { payload: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), sourceVersion, etag };
}

async function fetchCatalog(day: string) {
  const now = new Date(`${day}T04:00:00Z`);
  const list = await fetchAdventechJson("index.json");
  const active = selectActiveAdultQuarter(list.payload, now);
  if (!active) throw new Error("No verified current Indonesian adult quarterly");
  const detail = await fetchQuarterlyFromAdventech(active.id);
  const q = detail.payload?.quarterly;
  if (q?.id !== active.id || q?.index !== active.index || q?.start_date !== active.start_date ||
      q?.end_date !== active.end_date || !selectActiveAdultQuarter([q], now)) throw new Error("Invalid quarterly source");
  const classes = selectSabbathCatalog([{ classId: "adult", payload: detail.payload }]);
  if (classes.length !== 1) throw new Error("Invalid quarterly metadata");
  return { status: "available" as const, classes: classes.map((entry) => ({ ...entry,
    period: `${q.start_date}–${q.end_date}`, sourceUrl: `https://sabbath-school.adventech.io/in/${active.id}`,
    sourceVersion: detail.sourceVersion, fetchedAt: new Date().toISOString(),
  })) };
}

// Confirmed online/cache permission; PostgreSQL rights and offline remain separate.
const cachedCatalog = unstable_cache(fetchCatalog, ["sabbath-indonesian-catalog-v1"], { revalidate: 3600 });

export async function loadSabbathCatalog() {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Makassar" }).format(new Date());
  try { return await cachedCatalog(day); }
  catch { return { status: "unavailable" as const, classes: [] }; }
}

const cachedLesson = unstable_cache(async (quarterly: Parameters<typeof normalizeReaderLesson>[1], lessonId: string, _day: string) => {
  void _day; // WITA date is part of the cache identity, not the upstream path.
  const result = await fetchAdventechJson(`${quarterly.id}/lessons/${lessonId}/index.json`);
  return { status: "available" as const, data: normalizeReaderLesson(result.payload, quarterly, lessonId),
    sourceUrl: `https://sabbath-school.adventech.io/in/${quarterly.id}/${lessonId}`,
    sourceVersion: result.sourceVersion, fetchedAt: new Date().toISOString() };
}, ["sabbath-reader-lesson-v1"], { revalidate: 3600 });

const cachedDay = unstable_cache(async (quarterId: string, lesson: Parameters<typeof normalizeReaderDay>[1], dayId: string, _day: string) => {
  void _day;
  const result = await fetchAdventechJson(`${quarterId}/lessons/${lesson.id}/days/${dayId}/read/index.json`);
  return { status: "available" as const, data: normalizeReaderDay(result.payload, lesson, dayId), lesson,
    sourceUrl: `https://sabbath-school.adventech.io/in/${quarterId}/${lesson.id}/${dayId}`,
    sourceVersion: result.sourceVersion, fetchedAt: new Date().toISOString() };
}, ["sabbath-reader-day-v1"], { revalidate: 3600 });

export async function loadSabbathLesson(quarterId: string, lessonId: string) {
  if (!/^\d{4}-0[1-4]$/.test(quarterId) || !/^\d{2}$/.test(lessonId)) return { status: "not-found" as const };
  const catalog = await loadSabbathCatalog();
  if (catalog.status !== "available") return { status: "unavailable" as const };
  const quarterly = catalog.classes.find(entry => entry.classId === "adult" && entry.quarterly.id === quarterId)?.quarterly;
  if (!quarterly?.lessons.some((item: { id: string }) => item.id === lessonId)) return { status: "not-found" as const };
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Makassar" }).format(new Date());
  try { return await cachedLesson(quarterly, lessonId, day); }
  catch { return { status: "unavailable" as const }; }
}

export async function loadSabbathDay(quarterId: string, lessonId: string, dayId: string) {
  if (!/^\d{4}-0[1-4]$/.test(quarterId) || !/^\d{2}$/.test(lessonId) || !/^\d{2}$/.test(dayId)) return { status: "not-found" as const };
  const lesson = await loadSabbathLesson(quarterId, lessonId);
  if (lesson.status !== "available") return lesson;
  if (!lesson.data.days.some((item: { id: string }) => item.id === dayId)) return { status: "not-found" as const };
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Makassar" }).format(new Date());
  try { return await cachedDay(quarterId, lesson.data, dayId, day); }
  catch { return { status: "unavailable" as const }; }
}

export async function loadSabbathQuarterly(quarterId: string) {
  return refreshQuarterly(`id-${quarterId}`, {
    authorized: async () => false,
    fetchQuarterly: () => fetchQuarterlyFromAdventech(quarterId),
    readCache: async (sourceId: string) => createPostgresCache(await createServerSupabaseClient()).readCache(sourceId),
    writeCache: async (snapshot: Parameters<ReturnType<typeof createPostgresCache>["writeCache"]>[0]) =>
      createPostgresCache(await createServerSupabaseClient()).writeCache(snapshot),
    now: () => new Date(),
  });
}

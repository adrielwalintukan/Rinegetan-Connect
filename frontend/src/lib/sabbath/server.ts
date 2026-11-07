import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPostgresCache, refreshQuarterly } from "./adventech.mjs";

async function fetchQuarterlyFromAdventech(quarterId: string, fetcher: typeof fetch = fetch) {
  if (typeof quarterId !== "string" || !/^\d{4}-0[1-4](?:-[a-z0-9]+)?$/.test(quarterId)) {
    throw new Error("Invalid quarterly identifier");
  }
  const response = await fetcher(
    `https://sabbath-school.adventech.io/api/v2/id/quarterlies/${quarterId}/index.json`,
    { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") || "") || !response.body) {
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

// Both server and database rights gates remain closed until P4-005 is approved.
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

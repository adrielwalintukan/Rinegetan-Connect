function requiredText(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid Adventech metadata");
  return value.trim();
}

export function createPostgresCache(client) {
  return {
    async readCache(sourceId) {
      const { data, error } = await client.rpc("sabbath_cache_read", { p_source_id: sourceId });
      if (error || !Array.isArray(data) || data.length > 1) throw new Error("Cache unavailable");
      if (data.length === 0) return null;
      const row = data[0];
      return { sourceId: row.source_id, sourceVersion: row.source_version, fetchedAt: row.fetched_at,
        etag: row.etag, payload: row.payload };
    },
    async writeCache(snapshot) {
      const { data, error } = await client.rpc("sabbath_cache_write", {
        p_source_id: snapshot.sourceId, p_source_version: snapshot.sourceVersion, p_fetched_at: snapshot.fetchedAt,
        p_etag: snapshot.etag, p_payload: snapshot.payload,
      });
      if (error || data !== true) throw new Error("Cache unavailable");
    },
  };
}

export async function refreshQuarterly(sourceId, { authorized, fetchQuarterly, readCache, writeCache, now }) {
  const unavailable = { status: "unavailable" };
  const allowed = async () => { try { return await authorized(sourceId) === true; } catch { return false; } };
  if (typeof sourceId !== "string" || !sourceId.trim() || !await allowed()) return unavailable;
  try {
    const response = await fetchQuarterly(sourceId);
    const payload = normalizeQuarterly(response?.payload);
    if (payload.index !== sourceId) throw new Error("Invalid source");
    const sourceVersion = requiredText(response.sourceVersion);
    if (response.etag != null && typeof response.etag !== "string") throw new Error("Invalid source");
    const data = { sourceId, sourceVersion, fetchedAt: now().toISOString(), etag: response.etag ?? null, payload };
    if (!await allowed()) return unavailable;
    await writeCache(data);
    if (!await allowed()) return unavailable;
    return { status: "fresh", data };
  } catch {
    if (!await allowed()) return unavailable;
    try {
      const data = await readCache(sourceId);
      if (!await allowed() || !data || data.sourceId !== sourceId) return unavailable;
      const stored = data.payload;
      const payload = normalizeQuarterly({ quarterly: { ...stored, lang: stored?.language }, lessons: stored?.lessons });
      if (payload.index !== sourceId || !Number.isFinite(Date.parse(data.fetchedAt)) ||
          (data.etag != null && typeof data.etag !== "string") ||
          !stored.lessons.every((lesson, index) => lesson.position === index + 1)) return unavailable;
      const sourceVersion = requiredText(data.sourceVersion);
      return { status: "cached", data: { sourceId, sourceVersion, fetchedAt: data.fetchedAt, etag: data.etag ?? null, payload } };
    } catch {
      return unavailable;
    }
  }
}

export function normalizeSegment(input) {
  if (!Array.isArray(input?.blocks) || input.blocks.length === 0) throw new Error("Invalid Adventech content");
  const ids = new Set();
  const blocks = input.blocks.map((block) => {
    const id = requiredText(block?.id);
    if (ids.has(id) || !["paragraph", "heading"].includes(block?.type)) throw new Error("Invalid Adventech content");
    ids.add(id);
    requiredText(block.markdown);
    const markdown = block.markdown;
    if (block.type === "heading") {
      if (!Number.isInteger(block.depth) || block.depth < 1 || block.depth > 6) throw new Error("Invalid Adventech content");
      return { id, type: block.type, markdown, depth: block.depth };
    }
    return { id, type: block.type, markdown };
  });
  return { id: requiredText(input.id), index: requiredText(input.index), name: requiredText(input.name), blocks };
}

export function normalizeLesson(input) {
  if (!Array.isArray(input?.days) || input.days.length === 0) throw new Error("Invalid Adventech metadata");
  const ids = new Set();
  const indexes = new Set();
  const days = input.days.map((day) => {
    const id = requiredText(day?.id);
    const index = requiredText(day?.index);
    const readPath = requiredText(day?.read_path);
    if (ids.has(id) || indexes.has(index) || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(readPath) ||
        readPath.split("/").some((part) => part === "." || part === "..")) {
      throw new Error("Invalid Adventech metadata");
    }
    ids.add(id);
    indexes.add(index);
    return { id, index, title: requiredText(day?.title), readPath };
  });
  return { id: requiredText(input.lesson?.id), index: requiredText(input.lesson?.index),
    title: requiredText(input.lesson?.title), days };
}

export function normalizeQuarterly(input) {
  const quarterly = input?.quarterly;
  if (quarterly?.lang !== "id" || !Array.isArray(quarterly.credits) || quarterly.credits.length === 0 ||
      !Array.isArray(input?.lessons) || input.lessons.length === 0) {
    throw new Error("Invalid Adventech metadata");
  }
  const id = requiredText(quarterly.id);
  const index = requiredText(quarterly.index);
  if (index !== `id-${id}`) throw new Error("Invalid Adventech metadata");

  let cover;
  try { cover = new URL(requiredText(quarterly.cover)); } catch { throw new Error("Invalid Adventech metadata"); }
  if (cover.origin !== "https://sabbath-school.adventech.io" || cover.username || cover.password) {
    throw new Error("Invalid Adventech metadata");
  }

  const seen = new Set();
  const ids = new Set();
  const lessons = input.lessons.map((lesson, index) => {
    const id = requiredText(lesson?.id);
    const lessonIndex = requiredText(lesson?.index);
    if (seen.has(lessonIndex) || ids.has(id)) throw new Error("Invalid Adventech metadata");
    seen.add(lessonIndex);
    ids.add(id);
    return { id, index: lessonIndex, title: requiredText(lesson?.title), position: index + 1 };
  });

  return {
    id, index, language: "id",
    title: requiredText(quarterly.title), cover: cover.href,
    credits: quarterly.credits.map((credit) => ({ name: requiredText(credit?.name), value: requiredText(credit?.value) })),
    lessons,
  };
}

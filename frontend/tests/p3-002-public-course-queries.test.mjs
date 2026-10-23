import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { UserFacingError } from "../src/lib/api/errors.mjs";
import {
  PUBLIC_COURSES_TAG, PublicCourseQueryError, createPublicCourseClient,
  getPublicCourses, getPublicCourse, getPublicCourseLessons, getPublicLesson,
} from "../src/lib/courses/public-queries.mjs";

const courseId = "11111111-1111-4111-8111-111111111111";
const otherCourseId = "22222222-2222-4222-8222-222222222222";
const courseColumns = "id,title,slug,summary,published_at,updated_at";
const lessonColumns = "id,course_id,title,slug,summary,position,published_at,updated_at";
const course = { id: courseId, title: "Alkitab", slug: "alkitab", summary: "Ringkasan", published_at: "2026-10-22T00:00:00Z", updated_at: "2026-10-22T00:00:00Z" };
const lesson = { ...course, id: otherCourseId, course_id: courseId, title: "Pelajaran", slug: "pelajaran-1", position: 7 };
const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// Keep the real Supabase query builder; only the network replies are controlled.
function transport(replies) {
  const requests = [];
  const fetch = async (input, init) => {
    requests.push({ url: new URL(input), init });
    assert.ok(replies.length, "unexpected extra request");
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.data), {
      status: reply.status || 200, headers: { "Content-Type": "application/json" },
    });
  };
  return { requests, fetch, client: createClient("https://reader.example.test", "synthetic-anonymous-key", { auth, db: { retry: false }, global: { fetch } }) };
}

function assertQuery(request, table, columns, filters) {
  assert.equal(request.url.pathname, `/rest/v1/${table}`);
  assert.equal(request.url.searchParams.get("select"), columns);
  assert.equal(request.url.searchParams.get("status"), "eq.published");
  for (const [field, value] of Object.entries(filters)) assert.equal(request.url.searchParams.get(field), value);
  assert.equal(request.init.method, "GET");
}

function publicConfig() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://reader.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "synthetic-anonymous-key";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

test("course catalog reads beyond 1000 rows with explicit projection and stable 500-row pages", async () => {
  const rows = Array.from({ length: 1002 }, (_, i) => ({ ...course, id: `course-${i}` }));
  const { client, requests } = transport([{ data: rows.slice(0, 500) }, { data: rows.slice(500, 1000) }, { data: rows.slice(1000) }]);
  const result = await getPublicCourses(client);
  assert.equal(result.length, 1002);
  assert.deepEqual(result, rows);
  assert.equal(requests.length, 3);
  requests.forEach((request, i) => assertQuery(request, "courses", courseColumns, { order: "published_at.desc,id.asc", offset: String(i * 500), limit: "500" }));
});

test("lesson summaries read beyond 1500 rows in course scope without loading bodies or actors", async () => {
  const rows = Array.from({ length: 1502 }, (_, i) => ({ ...lesson, id: `lesson-${i}`, position: i * 3 + 1 }));
  const { client, requests } = transport([0, 500, 1000, 1500].map((start) => ({ data: rows.slice(start, start + 500) })));
  const result = await getPublicCourseLessons(courseId, client);
  assert.equal(result.length, 1502);
  assert.deepEqual(result, rows);
  assert.equal(requests.length, 4);
  requests.forEach((request, i) => assertQuery(request, "course_lessons", lessonColumns, { course_id: `eq.${courseId}`, order: "position.asc,id.asc", offset: String(i * 500), limit: "500" }));
});

test("an exact full page requests the final empty page", async () => {
  const { client, requests } = transport([{ data: Array.from({ length: 500 }, () => course) }, { data: [] }]);
  assert.equal((await getPublicCourses(client)).length, 500);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url.searchParams.get("offset"), "500");
});

test("later page failures reject the whole course or lesson collection", async () => {
  for (const [read, row] of [[(client) => getPublicCourses(client), course], [(client) => getPublicCourseLessons(courseId, client), lesson]]) {
    const { client } = transport([{ data: Array.from({ length: 500 }, () => row) }, { status: 400, data: { message: "PRIVATE_SENTINEL", code: "XX000" } }]);
    await assert.rejects(() => read(client), PublicCourseQueryError);
  }
});

test("course lookup uses published slug and returns only the public row", async () => {
  const { client, requests } = transport([{ data: [course] }]);
  assert.deepEqual(await getPublicCourse("alkitab", client), course);
  assert.equal(requests.length, 1);
  assertQuery(requests[0], "courses", courseColumns, { slug: "eq.alkitab" });
});

test("lesson lookup includes body only for the requested course and slug", async () => {
  const row = { ...lesson, body: "Paragraf satu.\n\n<strong>Teks biasa</strong>" };
  const { client, requests } = transport([{ data: [row] }]);
  assert.deepEqual(await getPublicLesson(courseId, "pelajaran-1", client), row);
  assertQuery(requests[0], "course_lessons", `${lessonColumns},body`, { course_id: `eq.${courseId}`, slug: "eq.pelajaran-1" });
});

test("missing course, hidden lesson and same slug in another course are not found", async () => {
  const { client, requests } = transport([{ data: [] }, { data: [] }]);
  assert.equal(await getPublicCourse("hilang", client), null);
  assert.equal(await getPublicLesson(otherCourseId, "pelajaran-1", client), null);
  assertQuery(requests[1], "course_lessons", `${lessonColumns},body`, { course_id: `eq.${otherCourseId}`, slug: "eq.pelajaran-1" });
});

test("invalid ASCII slugs return null before executing a query", async () => {
  const { client, requests } = transport([]);
  for (const slug of ["", "Upper", "-awal", "akhir-", "dua--kata", "spasi kata", "é", "a/b", "a?b", "a\n", "a".repeat(221), null, undefined]) {
    assert.equal(await getPublicCourse(slug, client), null);
    assert.equal(await getPublicLesson(courseId, slug, client), null);
  }
  assert.deepEqual(requests, []);
});

test("slug length 220 remains valid", async () => {
  const { client, requests } = transport([{ data: [] }, { data: [] }]);
  await getPublicCourse("a".repeat(220), client);
  await getPublicLesson(courseId, "a".repeat(220), client);
  assert.equal(requests.length, 2);
});

test("empty lists remain successful empty lists", async () => {
  const { client } = transport([{ data: [] }, { data: [] }]);
  assert.deepEqual(await getPublicCourses(client), []);
  assert.deepEqual(await getPublicCourseLessons(courseId, client), []);
});

test("query and network failures expose the safe error with no sentinel in errors or logs", async (t) => {
  const logs = t.mock.method(console, "error", () => {});
  const warnings = t.mock.method(console, "warn", () => {});
  const reads = [(client) => getPublicCourses(client), (client) => getPublicCourse("alkitab", client), (client) => getPublicCourseLessons(courseId, client), (client) => getPublicLesson(courseId, "pelajaran-1", client)];
  for (const read of reads) {
    for (const reply of [{ status: 400, data: { message: "PRIVATE_SENTINEL", details: "PRIVATE_SENTINEL", code: "XX000" } }, new Error("PRIVATE_SENTINEL")]) {
      const { client } = transport([reply]);
      await assert.rejects(() => read(client), (error) => {
        assert.ok(error instanceof PublicCourseQueryError);
        assert.ok(error instanceof UserFacingError);
        assert.equal(error.message, "Materi belum dapat dimuat. Silakan coba lagi.");
        assert.ok(!String(error.stack).includes("PRIVATE_SENTINEL"));
        assert.ok(!JSON.stringify(error).includes("PRIVATE_SENTINEL"));
        assert.equal(error.cause, undefined);
        return true;
      });
    }
  }
  assert.ok(!JSON.stringify([...logs.mock.calls, ...warnings.mock.calls]).includes("PRIVATE_SENTINEL"));
});

test("missing or invalid public configuration returns no client and readers reject instead of succeeding empty", async () => {
  publicConfig();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(createPublicCourseClient(), null);
  await assert.rejects(() => getPublicCourses(), PublicCourseQueryError);
  publicConfig();
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(createPublicCourseClient(), null);
  publicConfig();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "invalid-url";
  assert.equal(createPublicCourseClient(), null);
  publicConfig();
  for (const read of [(client) => getPublicCourses(client), (client) => getPublicCourse("alkitab", client), (client) => getPublicCourseLessons(courseId, client), (client) => getPublicLesson(courseId, "pelajaran-1", client)]) {
    await assert.rejects(() => read(null), PublicCourseQueryError);
  }
});

test("anonymous factory disables session handling and caches GET reads for 60 seconds with reader tag", async (t) => {
  publicConfig();
  const boundary = transport([{ data: [course] }, { data: [course] }]);
  t.mock.method(globalThis, "fetch", boundary.fetch);
  const client = createPublicCourseClient();
  assert.ok(client);
  assert.equal(client.auth.persistSession, false);
  assert.equal(client.auth.autoRefreshToken, false);
  assert.equal(client.auth.detectSessionInUrl, false);
  assert.deepEqual(await getPublicCourses(client), [course]);
  assert.deepEqual(await getPublicCourse("alkitab"), course);
  for (const { init } of boundary.requests) {
    assert.equal(init.cache, "force-cache");
    assert.deepEqual(init.next, { revalidate: 60, tags: [PUBLIC_COURSES_TAG] });
    assert.equal(PUBLIC_COURSES_TAG, "public-courses");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer synthetic-anonymous-key");
    assert.equal(new Headers(init.headers).get("Cookie"), null);
  }
});

test("anonymous factory supports the existing public anon-key fallback", async (t) => {
  publicConfig();
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-legacy-anon-key";
  const boundary = transport([{ data: [] }]);
  t.mock.method(globalThis, "fetch", boundary.fetch);
  assert.deepEqual(await getPublicCourses(), []);
  assert.equal(new Headers(boundary.requests[0].init.headers).get("Authorization"), "Bearer synthetic-legacy-anon-key");
});

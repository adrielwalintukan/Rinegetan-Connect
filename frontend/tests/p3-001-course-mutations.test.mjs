import assert from "node:assert/strict";
import test from "node:test";
import { parseCourseMutation, executeCourseMutation, CourseMutationError } from "../src/lib/courses/mutations.mjs";
import { clientFor, course, lesson, id } from "./helpers/course-client.mjs";
const save = (data = course, extra = {}) => ({ entity: "courses", action: "save", data, ...extra });
const bad = (value) => assert.throws(() => parseCourseMutation(value), (e) => e instanceof CourseMutationError && e.status === 400);

test("parser rejects malformed objects, arbitrary targets/actions and bad UUIDs", () => {
  for (const value of [null, [], 2, "x", {}, save(course, { entity: "audit_logs" }), save(course, { action: "upsert" }), save(course, { id: "bad" }), save(course, { id: null })]) bad(value);
});
test("forms normalize edges and CRLF while preserving paragraphs", () => {
  assert.deepEqual(parseCourseMutation(save({ title: " T ", slug: " t ", summary: " R " })).data, { title: "T", slug: "t", summary: "R" });
  const parsed = parseCourseMutation({ entity: "course_lessons", action: "save", data: { ...lesson, body: " \r\nSatu  dua\r\n\r\nTiga\rEmpat\r\n " } });
  assert.equal(parsed.data.body, "Satu  dua\n\nTiga\nEmpat");
});
test("save rejects metadata, status, extra fields and parent reassignment", () => {
  for (const field of ["status", "id", "created_by", "updated_by", "created_at", "updated_at", "published_at", "body", "unknown"]) bad(save({ ...course, [field]: "private" }));
  bad(save(course, { status: "published" })); bad(save(course, { role: "admin" }));
  bad({ entity: "course_lessons", action: "save", id, data: lesson });
  bad({ entity: "course_lessons", action: "save", data: { ...lesson, course_id: "bad" } });
  const { course_id, ...update } = lesson;
  assert.deepEqual(parseCourseMutation({ entity: "course_lessons", action: "save", id, data: update }).data, update);
});
test("limits count Unicode code points like Postgres char_length", () => {
  for (const [field, limit, char] of [["title", 200, "😀"], ["summary", 500, "😀"], ["slug", 220, "a"]]) {
    assert.equal(parseCourseMutation(save({ ...course, [field]: char.repeat(limit) })).data[field], char.repeat(limit));
    bad(save({ ...course, [field]: char.repeat(limit + 1) }));
  }
  const value = { entity: "course_lessons", action: "save", data: { ...lesson, body: "😀".repeat(50000) } };
  assert.equal(parseCourseMutation(value).data.body, value.data.body);
  bad({ ...value, data: { ...value.data, body: "😀".repeat(50001) } });
  for (const title of ["", "  ", 1, null]) bad(save({ ...course, title }));
  for (const slug of ["", "UPPER", "a_b", "-a", "a--b", "a-"]) bad(save({ ...course, slug }));
  bad(save({ ...course, summary: null }));
  bad({ entity: "course_lessons", action: "save", data: { ...lesson, body: 123 } });
  assert.equal(parseCourseMutation(save({ ...course, summary: "" })).data.summary, "");
});
test("position must be a positive PostgreSQL integer", () => {
  for (const position of ["2", NaN, Infinity, 1.5, 0, -1, 2147483648]) bad({ entity: "course_lessons", action: "save", data: { ...lesson, position } });
  assert.equal(parseCourseMutation({ entity: "course_lessons", action: "save", data: { ...lesson, position: 2147483647 } }).data.position, 2147483647);
});
test("status/delete require ID and reject embedded save fields", () => {
  for (const action of ["status", "delete"]) {
    const mutation = { entity: "courses", action, id, ...(action === "status" ? { status: "published" } : {}) };
    assert.deepEqual(parseCourseMutation(mutation), mutation);
    bad({ ...mutation, id: undefined }); bad({ ...mutation, data: course }); bad({ ...mutation, title: "hidden" });
  }
  bad({ entity: "courses", action: "status", id, status: "pending" });
  bad({ entity: "courses", action: "delete", id, status: "draft" });
});
test("create writes only form fields plus Draft and returns the database row", async () => {
  for (const [entity, data] of [["courses", course], ["course_lessons", lesson]]) {
    const row = { ...data, id, status: "draft", created_by: id };
    const client = clientFor({ data: row });
    assert.deepEqual(await executeCourseMutation(client, { entity, action: "save", data }, "editor"), row);
    assert.deepEqual(client.calls, [["from", entity], ["insert", { ...data, status: "draft" }], ["select", undefined], ["single"]]);
  }
});
test("save Published preserves status; status action only updates status", async () => {
  const row = { ...course, id, status: "published" }, client = clientFor({ data: row });
  assert.deepEqual(await executeCourseMutation(client, save(course, { id }), "admin"), row);
  assert.deepEqual(client.calls, [["from", "courses"], ["update", course], ["eq", "id", id], ["select", undefined], ["single"]]);
  const statusClient = clientFor({ data: { ...row, status: "archived" } });
  await executeCourseMutation(statusClient, { entity: "courses", action: "status", id, status: "archived" }, "editor");
  assert.deepEqual(statusClient.calls[1], ["update", { status: "archived" }]);
});
test("only Admin deletes; validation and role check precede all queries", async () => {
  const client = clientFor({ data: { id } });
  await assert.rejects(executeCourseMutation(client, { entity: "courses", action: "delete", id }, "editor"), (e) => e.status === 403);
  await assert.rejects(executeCourseMutation(client, save(), "guest"), (e) => e.status === 403);
  await assert.rejects(executeCourseMutation(client, save({ ...course, status: "published" }), "admin"), (e) => e.status === 400);
  assert.deepEqual(client.calls, []);
  assert.deepEqual(await executeCourseMutation(client, { entity: "courses", action: "delete", id }, "admin"), { id });
  assert.deepEqual(client.calls, [["from", "courses"], ["delete"], ["eq", "id", id], ["select", "id"], ["single"]]);
});
test("missing rows and database failures become safe errors with clear conflicts", async () => {
  for (const [result, status, pattern] of [
    [{ data: null }, 404, /ditemukan/], [{ error: { code: "PGRST116" } }, 404, /ditemukan/],
    [{ error: { code: "23505" } }, 409, /slug.*nomor urut/i], [{ error: { code: "23503" } }, 409, /terkait|lesson/i],
    [{ error: { code: "23514" } }, 400, /valid|lengkap/i], [{ error: { code: "42501" } }, 403, /izin/i], [{ error: { code: "XX000" } }, 500, /kesalahan/i],
  ]) {
    const client = clientFor({ ...result, ...(result.error ? { error: { ...result.error, message: "PRIVATE_SENTINEL", details: "PRIVATE_SENTINEL" } } : {}) });
    await assert.rejects(executeCourseMutation(client, save(course, { id }), "admin"), (e) => e instanceof CourseMutationError && e.status === status && pattern.test(e.message) && !e.message.includes("PRIVATE_SENTINEL"));
  }
  await assert.rejects(executeCourseMutation(clientFor({ throws: new Error("PRIVATE_SENTINEL") }), save(), "admin"), (e) => e.status === 500 && !e.message.includes("PRIVATE_SENTINEL"));
});

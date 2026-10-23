import { UserFacingError, publicErrorMessage } from "../api/errors.mjs";

/** @typedef {{ title: string, slug: string, summary: string }} CourseForm */
/** @typedef {CourseForm & { body: string, position: number, course_id?: string }} LessonForm */
/** @typedef {{ entity: 'courses' | 'course_lessons', action: 'save' | 'status' | 'delete', id?: string, data?: CourseForm | LessonForm, status?: import('../../types/content').ContentStatus }} CourseMutation */

export class CourseMutationError extends UserFacingError {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message);
    this.name = "CourseMutationError";
    this.status = status;
  }
}

const invalid = () => new CourseMutationError("Data course atau lesson tidak valid. Periksa kembali isian Anda.", 400);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** @param {unknown} value @returns {Record<string, unknown>} */
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return /** @type {Record<string, unknown>} */ (value);
}
/** @param {Record<string, unknown>} value @param {string[]} allowed */
function only(value, allowed) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw invalid();
}
/** @param {unknown} value @returns {string} */
function identifier(value) {
  if (typeof value !== "string" || !uuid.test(value)) throw invalid();
  return value;
}
/** Code point limits shared by browser and server; normalization matches persisted text.
 * @param {string} value @param {number} max @param {string} label
 * @returns {string | null}
 */
export function courseTextLengthError(value, max, label) {
  return Array.from(value.replace(/\r\n?/g, "\n").trim()).length > max
    ? `${label} maksimal ${max.toLocaleString("id-ID")} karakter. Kurangi isian sebelum menyimpan.` : null;
}
/** @param {unknown} value @param {number} max @param {boolean} [required] @param {string} [label] */
function text(value, max, required = false, label = "Teks") {
  if (typeof value !== "string") throw invalid();
  const clean = value.replace(/\r\n?/g, "\n").trim();
  // Array.from counts Unicode code points, matching PostgreSQL char_length.
  const overflow = courseTextLengthError(clean, max, label);
  if (overflow) throw new CourseMutationError(overflow, 400);
  if ((required && !clean) || clean.includes("\0")) throw invalid();
  return clean;
}

/** Validate the complete command; no caller-supplied identity or lifecycle metadata is copied.
 * @param {unknown} value @returns {CourseMutation}
 */
export function parseCourseMutation(value) {
  const input = object(value);
  if (input.entity !== "courses" && input.entity !== "course_lessons") throw invalid();
  const entity = input.entity;
  if (input.action === "status" || input.action === "delete") {
    const action = input.action;
    only(input, action === "status" ? ["entity", "action", "id", "status"] : ["entity", "action", "id"]);
    const id = identifier(input.id);
    if (action === "delete") return { entity, action, id };
    if (input.status !== "draft" && input.status !== "published" && input.status !== "archived") throw invalid();
    return { entity, action, id, status: input.status };
  }
  if (input.action !== "save") throw invalid();
  only(input, ["entity", "action", "id", "data"]);
  const id = "id" in input ? identifier(input.id) : undefined;
  const data = object(input.data);
  const fields = ["title", "slug", "summary"];
  if (entity === "course_lessons") fields.push("body", "position", ...(!id ? ["course_id"] : []));
  only(data, fields);
  const title = text(data.title, 200, true, "Judul");
  const slug = text(data.slug, 220, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw invalid();
  const summary = text(data.summary, 500, false, "Ringkasan");
  /** @type {CourseForm | LessonForm} */
  let form = { title, slug, summary };
  if (entity === "course_lessons") {
    const position = data.position;
    if (typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > 2147483647) throw invalid();
    form = { ...form, body: text(data.body, 50000, false, "Isi lesson"), position, ...(!id ? { course_id: identifier(data.course_id) } : {}) };
  }
  return { entity, action: "save", ...(id ? { id } : {}), data: form };
}

/** @param {unknown} error @returns {CourseMutationError} */
function mutationFailure(error) {
  if (error instanceof CourseMutationError) return error;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23505") return new CourseMutationError("Slug atau nomor urut lesson sudah dipakai. Gunakan slug atau nomor urut lain.", 409);
  if (code === "23503") return new CourseMutationError("Data terkait tidak ditemukan atau course masih memiliki lesson. Periksa course induk dan hapus lesson terlebih dahulu bila ingin menghapus course.", 409);
  const status = code === "PGRST116" ? 404 : code === "42501" ? 403 : ["23502", "23514", "22P02", "22003"].includes(code) ? 400 : 500;
  return new CourseMutationError(publicErrorMessage(error), status);
}

/** Execute using the session client so RLS and DB lifecycle/audit triggers remain authoritative.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {CourseMutation} mutation
 * @param {'admin' | 'editor'} role
 * @returns {Promise<import('../../types/courses').Course | import('../../types/courses').CourseLesson | { id: string }>}
 */
export async function executeCourseMutation(client, mutation, role) {
  const command = parseCourseMutation(mutation);
  if ((role !== "admin" && role !== "editor") || (command.action === "delete" && role !== "admin")) {
    throw new CourseMutationError("Anda tidak memiliki izin untuk melakukan tindakan ini.", 403);
  }
  try {
    // Targets come only from the two validated literals, never an arbitrary table name.
    const table = client.from(command.entity);
    let query;
    if (command.action === "delete") query = table.delete().eq("id", command.id);
    else if (command.action === "status") query = table.update({ status: command.status }).eq("id", command.id);
    else if (command.id) query = table.update(command.data).eq("id", command.id);
    else query = table.insert({ ...command.data, status: "draft" });
    const { data, error } = await query.select(command.action === "delete" ? "id" : undefined).single();
    if (error) throw mutationFailure(error);
    if (!data) throw new CourseMutationError("Data tidak ditemukan.", 404);
    return data;
  } catch (error) {
    throw mutationFailure(error);
  }
}

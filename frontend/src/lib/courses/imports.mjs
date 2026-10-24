// frontend/src/lib/courses/imports.mjs
import { UserFacingError } from "../api/errors.mjs";
import { courseTextLengthError } from "./mutations.mjs";

export const IMPORT_FORMAT = "rinegetan-course-import/1";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_LESSONS = 100;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CourseImportError extends UserFacingError {
  /** @param {string} message @param {number} [status] */
  constructor(message, status = 400) {
    super(message);
    this.name = "CourseImportError";
    this.status = status;
  }
}
/** @param {string} path @param {string} reason */
const fail = (path, reason) => new CourseImportError(`Berkas impor tidak valid: ${path} ${reason}.`);

/** @param {unknown} value @param {string} path @param {string[]} keys @returns {Record<string, unknown>} */
function object(value, path, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail(path, "harus berupa objek");
  const extra = Object.keys(value).find((key) => !keys.includes(key));
  if (extra) throw fail(`${path === "berkas" ? "" : `${path}.`}${extra}`, "tidak dikenal");
  return /** @type {Record<string, unknown>} */ (value);
}
/** Same normalization and code point limits as the course CMS.
 * @param {unknown} value @param {string} path @param {number} max @param {boolean} required */
function text(value, path, max, required) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw fail(path, "harus berupa teks");
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if (clean.includes("\0") || !clean.isWellFormed()) throw fail(path, "berisi karakter yang tidak diizinkan");
  if (required && !clean) throw fail(path, "wajib diisi");
  if (courseTextLengthError(clean, max, path)) throw fail(path, `maksimal ${max.toLocaleString("id-ID")} karakter`);
  return clean;
}
/** @param {unknown} value @param {string} path */
function slug(value, path) {
  const clean = text(value, path, 220, true);
  if (!slugPattern.test(clean)) throw fail(path, "hanya boleh huruf kecil, angka, dan tanda hubung");
  return clean;
}
/** @param {unknown} value @param {string} path @returns {string | null} */
function url(value, path) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw fail(path, "harus URL https maksimal 2.048 karakter");
  // Store the exact string we validated: https:// prefix, no whitespace/control chars, no lone surrogates.
  if (!value.startsWith("https://") || /[\u0000- \u007f\s]/.test(value) || !value.isWellFormed()) throw fail(path, "bukan URL https yang valid (tanpa spasi atau karakter kontrol)");
  let parsed;
  try { parsed = new URL(value); } catch { throw fail(path, "bukan URL yang valid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw fail(path, "harus URL https tanpa nama pengguna atau kata sandi");
  return value;
}

/** Validate one staff-prepared course file; nothing is trusted or copied beyond the documented fields.
 * @param {string} raw
 * @returns {import('../../types/courses').CourseImportPayload}
 */
export function parseCourseImport(raw) {
  if (typeof raw !== "string") throw new CourseImportError("Berkas impor bukan JSON yang valid.");
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) {
    throw new CourseImportError("Berkas impor melebihi batas 2 MB.", 413);
  }
  let input;
  try { input = JSON.parse(raw); } catch { throw new CourseImportError("Berkas impor bukan JSON yang valid."); }
  const root = object(input, "berkas", ["format", "language", "source", "license", "course", "lessons"]);
  if (root.format !== IMPORT_FORMAT) throw fail("format", `harus "${IMPORT_FORMAT}"`);
  if (root.language !== "id") throw fail("language", 'harus "id" (Bahasa Indonesia)');
  const source = object(root.source, "source", ["name", "url", "rights_holder"]);
  const license = object(root.license, "license", ["name", "url", "notes"]);
  const course = object(root.course, "course", ["title", "slug", "summary"]);
  if (!Array.isArray(root.lessons) || root.lessons.length < 1 || root.lessons.length > MAX_IMPORT_LESSONS) {
    throw fail("lessons", `harus berisi 1–${MAX_IMPORT_LESSONS} lesson`);
  }
  const slugs = new Set(), positions = new Set();
  const lessons = root.lessons.map((value, index) => {
    const path = `lessons[${index}]`;
    const lesson = object(value, path, ["position", "title", "slug", "summary", "body"]);
    const position = lesson.position;
    if (typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > 2147483647) {
      throw fail(`${path}.position`, "harus bilangan bulat 1–2.147.483.647");
    }
    const lessonSlug = slug(lesson.slug, `${path}.slug`);
    if (slugs.has(lessonSlug)) throw fail(`${path}.slug`, "sudah dipakai lesson lain dalam berkas");
    if (positions.has(position)) throw fail(`${path}.position`, "sudah dipakai lesson lain dalam berkas");
    slugs.add(lessonSlug); positions.add(position);
    return {
      position,
      title: text(lesson.title, `${path}.title`, 200, true),
      slug: lessonSlug,
      summary: text(lesson.summary, `${path}.summary`, 500, false),
      body: text(lesson.body, `${path}.body`, 50000, true),
    };
  });
  return {
    format: IMPORT_FORMAT,
    language: "id",
    source: { name: text(source.name, "source.name", 200, true), url: url(source.url, "source.url"), rights_holder: text(source.rights_holder, "source.rights_holder", 200, true) },
    license: { name: text(license.name, "license.name", 200, true), url: url(license.url, "license.url"), notes: text(license.notes, "license.notes", 1000, false) },
    course: { title: text(course.title, "course.title", 200, true), slug: slug(course.slug, "course.slug"), summary: text(course.summary, "course.summary", 500, false) },
    lessons,
  };
}

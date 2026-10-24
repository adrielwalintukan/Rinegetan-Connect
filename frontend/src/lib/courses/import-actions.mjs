import { CourseImportError, MAX_IMPORT_BYTES } from "./imports.mjs";
import { publicErrorMessage } from "../api/errors.mjs";

export const IMPORT_LIST_COLUMNS = "id, status, course_title, course_slug, lesson_count, source_name, source_url, rights_holder, license_name, license_url, license_notes, created_by, created_at, reviewed_by, reviewed_at, review_note, course_id";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_MESSAGES = {
  course_import_slug_taken: ["Slug course sudah dipakai. Ubah slug di berkas lalu unggah ulang.", 409],
  course_import_not_pending: ["Impor ini sudah diputuskan sebelumnya. Muat ulang halaman.", 409],
  course_import_not_found: ["Impor tidak ditemukan.", 404],
  course_import_admin_only: ["Hanya Admin yang dapat menyetujui lisensi impor.", 403],
};

/** @param {unknown} error */
export function importFailure(error) {
  if (error instanceof CourseImportError) return error;
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const known = Object.entries(STATUS_MESSAGES).find(([key]) => message.includes(key));
  if (known) return new CourseImportError(known[1][0], known[1][1]);
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23505") return new CourseImportError("Slug course sudah dipakai course atau impor lain yang menunggu. Ubah slug lalu unggah ulang.", 409);
  const status = code === "PGRST116" ? 404 : code === "42501" ? 403 : ["23502", "23514", "22P02", "22003"].includes(code) ? 400 : 500;
  return new CourseImportError(publicErrorMessage(error), status);
}
/** @param {unknown} value */
export function importId(value) {
  if (typeof value !== "string" || !uuid.test(value)) throw new CourseImportError("Impor tidak valid.", 400);
  return value;
}
/** @param {'admin' | 'editor'} role */
function staffOnly(role) {
  if (role !== "admin" && role !== "editor") throw new CourseImportError("Hanya staf aktif yang dapat mengimpor materi.", 403);
}

/** Insert a validated file as pending staging; lifecycle columns are set by the database.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {import('../../types/courses').CourseImportPayload} payload
 * @param {'admin' | 'editor'} role
 */
export async function createCourseImport(client, payload, role) {
  staffOnly(role);
  const { data, error } = await client.from("course_imports").insert({
    payload,
    course_title: payload.course.title,
    course_slug: payload.course.slug,
    lesson_count: payload.lessons.length,
    source_name: payload.source.name,
    source_url: payload.source.url,
    rights_holder: payload.source.rights_holder,
    license_name: payload.license.name,
    license_url: payload.license.url,
    license_notes: payload.license.notes || null,
  }).select(IMPORT_LIST_COLUMNS).single();
  if (error || !data) throw importFailure(error);
  return data;
}

/** Metadata only (no payload): pending first, then the rest, each newest first, at most 50 rows.
 * @param {import('@supabase/supabase-js').SupabaseClient} client */
export async function loadCourseImports(client) {
  const LIMIT = 50;
  try {
    const base = () => client.from("course_imports").select(IMPORT_LIST_COLUMNS);
    const pending = await base().eq("status", "pending").order("created_at", { ascending: false }).limit(LIMIT);
    if (pending.error || !pending.data) return { data: null, error: true };
    if (pending.data.length >= LIMIT) return { data: pending.data, error: false };
    const rest = await base().neq("status", "pending").order("created_at", { ascending: false }).limit(LIMIT - pending.data.length);
    return rest.error || !rest.data ? { data: null, error: true } : { data: [...pending.data, ...rest.data], error: false };
  } catch { return { data: null, error: true }; }
}

/** Read the request body with a hard byte cap so oversized uploads are never buffered.
 * @param {Request} request @returns {Promise<string>} */
export async function readImportBody(request) {
  const tooBig = () => new CourseImportError("Berkas impor melebihi batas 2 MB.", 413);
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_IMPORT_BYTES) throw tooBig();
  const chunks = [];
  let total = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length > MAX_IMPORT_BYTES) { await reader.cancel(); throw tooBig(); }
      chunks.push(value); total += value.length;
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new CourseImportError("Berkas impor bukan JSON yang valid.", 400); }
}

/** 401/403 response for a StaffAccessError (matched by name; the class lives in TS), else null.
 * @param {unknown} error @returns {Response | null} */
export function staffAccessResponse(error) {
  if (!(error instanceof Error) || error.name !== "StaffAccessError") return null;
  const unauthenticated = /** @type {{ code?: string }} */ (error).code === "not_authenticated";
  return Response.json(
    { error: unauthenticated ? "Sesi berakhir. Silakan masuk kembali." : "Hanya staf aktif yang dapat mengelola materi." },
    { status: unauthenticated ? 401 : 403 },
  );
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} id */
export async function loadCourseImportPayload(client, id) {
  const { data, error } = await client.from("course_imports").select("payload").eq("id", importId(id)).single();
  if (error || !data) throw importFailure(error);
  return data.payload;
}

/** @param {unknown} value @returns {{ action: 'approve' } | { action: 'reject', note: string }} */
export function parseCourseImportDecision(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : {};
  if (input.action === "approve" && Object.keys(input).length === 1) return { action: "approve" };
  if (input.action === "reject" && Object.keys(input).every((key) => key === "action" || key === "note") && typeof input.note === "string") {
    const note = input.note.replace(/\r\n?/g, "\n").trim();
    if (note && Array.from(note).length <= 500 && !note.includes("\0")) return { action: "reject", note };
    throw new CourseImportError("Alasan penolakan wajib diisi, maksimal 500 karakter.", 400);
  }
  throw new CourseImportError("Keputusan impor tidak valid.", 400);
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} id
 * @param {{ action: 'approve' } | { action: 'reject', note: string }} decision @param {'admin' | 'editor'} role */
export async function decideCourseImport(client, id, decision, role) {
  if (role !== "admin") throw new CourseImportError("Hanya Admin yang dapat menyetujui atau menolak impor.", 403);
  if (decision.action === "approve") {
    const { data, error } = await client.rpc("approve_course_import", { p_import_id: id });
    if (error || !data) throw importFailure(error);
    return { id, course_id: data };
  }
  const { data, error } = await client.from("course_imports").update({ status: "rejected", review_note: decision.note })
    .eq("id", id).eq("status", "pending").select("id").single();
  const noRow = error ? error.code === "PGRST116" : !data;
  if (error || !data) throw importFailure(noRow ? { message: "course_import_not_pending" } : error);
  return { id: data.id };
}

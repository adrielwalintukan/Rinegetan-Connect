// frontend/src/lib/forms/pastoral-admin.mjs
import { publicErrorMessage } from "../api/errors.mjs";
import { PublicFormError } from "./public-form.mjs";

export const PASTORAL_TABLES = {
  prayer_requests: { columns: "id, name, contact, request, wants_contact, status, created_at, handled_at", statuses: ["new", "prayed", "closed"] },
  visitor_submissions: { columns: "id, name, contact, visit_date, party_size, message, status, created_at, handled_at", statuses: ["new", "contacted", "closed"] },
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 50 newest rows; RLS already limits rows to active Admins.
 * @param {import('@supabase/supabase-js').SupabaseClient} client @param {keyof typeof PASTORAL_TABLES} table */
export async function loadPastoralRows(client, table) {
  try {
    const { data, error } = await client.from(table).select(PASTORAL_TABLES[table].columns).order("created_at", { ascending: false }).limit(50);
    return error || !data ? { data: null, error: true } : { data, error: false };
  } catch { return { data: null, error: true }; }
}

/** @param {unknown} input @param {keyof typeof PASTORAL_TABLES} table @returns {string} */
export function parsePastoralStatus(input, table) {
  const data = input && typeof input === "object" && !Array.isArray(input) ? /** @type {Record<string, unknown>} */ (input) : null;
  if (!data || Object.keys(data).some((key) => key !== "status") || typeof data.status !== "string" || !PASTORAL_TABLES[table].statuses.includes(data.status)) {
    throw new PublicFormError("Status tidak valid.", 400);
  }
  return data.status;
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {keyof typeof PASTORAL_TABLES} table
 * @param {string} id @param {string} status @param {'admin' | 'editor'} role */
export async function updatePastoralStatus(client, table, id, status, role) {
  if (role !== "admin") throw new PublicFormError("Hanya Admin yang dapat mengelola data pastoral.", 403);
  if (typeof id !== "string" || !uuid.test(id)) throw new PublicFormError("Data tidak valid.", 400);
  const { data, error } = await client.from(table).update({ status }).eq("id", id).select("id, status").maybeSingle();
  if (error) throw new PublicFormError(publicErrorMessage(error), error.code === "42501" ? 403 : 500);
  if (!data) throw new PublicFormError("Data tidak ditemukan.", 404);
  return data;
}

/** Writes one count-only `pastoral.viewed` audit; false means the caller must not show the rows.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ study_interest_leads: number, prayer_requests: number, visitor_submissions: number }} rows */
export async function recordPastoralAccess(client, rows) {
  try {
    const { error } = await client.rpc("record_pastoral_access", { p_study_interest: rows.study_interest_leads, p_prayer: rows.prayer_requests, p_visit: rows.visitor_submissions });
    return !error;
  } catch { return false; }
}

/** Rows past the retention cut-off per table; counts only.
 * @param {import('@supabase/supabase-js').SupabaseClient} client */
export async function loadExpiredPastoralCounts(client) {
  try {
    const { data, error } = await client.rpc("expired_pastoral_counts");
    const row = Array.isArray(data) ? data[0] : null;
    return error || !row ? { data: null, error: true } : { data: row, error: false };
  } catch { return { data: null, error: true }; }
}

/** Deletes every row past the cut-off in all three tables; the database writes the audit.
 * @param {import('@supabase/supabase-js').SupabaseClient} client @param {'admin' | 'editor'} role */
export async function purgeExpiredPastoralData(client, role) {
  if (role !== "admin") throw new PublicFormError("Hanya Admin yang dapat mengelola data pastoral.", 403);
  const { data, error } = await client.rpc("purge_expired_pastoral_data");
  if (error) throw new PublicFormError(publicErrorMessage(error), error.code === "42501" ? 403 : 500);
  return Array.isArray(data) ? data[0] : data;
}

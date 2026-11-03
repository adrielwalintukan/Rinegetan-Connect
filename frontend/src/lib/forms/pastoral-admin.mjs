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

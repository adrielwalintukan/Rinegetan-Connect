// frontend/src/lib/forms/study-interest-admin.mjs
import { publicErrorMessage } from "../api/errors.mjs";
import { StudyInterestError } from "./study-interest.mjs";

export const STUDY_INTEREST_COLUMNS = "id, name, contact, message, status, created_at, handled_at";
const STATUSES = ["new", "contacted", "closed"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 50 newest leads; RLS already limits rows to active Admins.
 * @param {import('@supabase/supabase-js').SupabaseClient} client */
export async function loadStudyInterestLeads(client) {
  try {
    const { data, error } = await client.from("study_interest_leads").select(STUDY_INTEREST_COLUMNS).order("created_at", { ascending: false }).limit(50);
    return error || !data ? { data: null, error: true } : { data, error: false };
  } catch { return { data: null, error: true }; }
}

/** @param {unknown} input @returns {"new" | "contacted" | "closed"} */
export function parseLeadStatus(input) {
  const data = input && typeof input === "object" && !Array.isArray(input) ? /** @type {Record<string, unknown>} */ (input) : null;
  if (!data || Object.keys(data).some((key) => key !== "status") || typeof data.status !== "string" || !STATUSES.includes(data.status)) {
    throw new StudyInterestError("Status tidak valid.", 400);
  }
  return /** @type {"new" | "contacted" | "closed"} */ (data.status);
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} id
 * @param {"new" | "contacted" | "closed"} status @param {'admin' | 'editor'} role */
export async function updateLeadStatus(client, id, status, role) {
  if (role !== "admin") throw new StudyInterestError("Hanya Admin yang dapat mengelola minat belajar.", 403);
  if (typeof id !== "string" || !uuid.test(id)) throw new StudyInterestError("Data tidak valid.", 400);
  const { data, error } = await client.from("study_interest_leads").update({ status }).eq("id", id).select("id, status").maybeSingle();
  if (error) throw new StudyInterestError(publicErrorMessage(error), error.code === "42501" ? 403 : 500);
  if (!data) throw new StudyInterestError("Data tidak ditemukan.", 404);
  return data;
}

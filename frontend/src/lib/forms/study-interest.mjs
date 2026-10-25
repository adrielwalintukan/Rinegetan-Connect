// frontend/src/lib/forms/study-interest.mjs
import { createHmac } from "node:crypto";
import { UserFacingError, GENERIC_ERROR_MESSAGE } from "../api/errors.mjs";

export const STUDY_INTEREST_CONSENT_VERSION = "draft-2026-10-26";
export const MAX_STUDY_INTEREST_BYTES = 8192;
const KEYS = ["name", "contact", "message", "consent", "website", "turnstileToken"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +()\-]+$/;
const SUCCESS = "Terima kasih. Tim kami akan menghubungi Anda.";

export class StudyInterestError extends UserFacingError {
  /** @param {string} message @param {number} [status] @param {string} [field] */
  constructor(message, status = 400, field) { super(message); this.name = "StudyInterestError"; this.status = status; this.field = field; }
}
/** @param {unknown} value @param {string} field @param {string} label @param {number} max @param {boolean} required */
function text(value, field, label, max, required) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new StudyInterestError(`${label} tidak valid.`, 400, field);
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if (clean.includes("\0") || !clean.isWellFormed()) throw new StudyInterestError(`${label} berisi karakter yang tidak diizinkan.`, 400, field);
  if (required && !clean) throw new StudyInterestError(`${label} wajib diisi.`, 400, field);
  if (Array.from(clean).length > max) throw new StudyInterestError(`${label} maksimal ${max.toLocaleString("id-ID")} karakter.`, 400, field);
  return clean;
}
/** @param {unknown} input */
export function parseStudyInterest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StudyInterestError("Format permintaan tidak valid.");
  const data = /** @type {Record<string, unknown>} */ (input);
  if (Object.keys(data).some((key) => !KEYS.includes(key))) throw new StudyInterestError("Format permintaan tidak valid.");
  // Bots that fill the honeypot get the generic success before any field-level feedback.
  if (typeof data.website === "string" && data.website.trim() !== "") return { name: "", contact: "", message: "", honeypot: true, turnstileToken: "" };
  const name = text(data.name, "name", "Nama", 100, true);
  const contact = text(data.contact, "contact", "Kontak", 254, true);
  const digits = contact.replace(/\D/g, "").length;
  if (!EMAIL.test(contact) && !(PHONE.test(contact) && digits >= 8 && digits <= 15)) {
    throw new StudyInterestError("Isi nomor WhatsApp atau email yang valid.", 400, "contact");
  }
  const message = text(data.message, "message", "Pesan", 1000, false);
  if (data.consent !== true) throw new StudyInterestError("Centang persetujuan untuk melanjutkan.", 400, "consent");
  const turnstileToken = typeof data.turnstileToken === "string" ? data.turnstileToken : "";
  return { name, contact, message, honeypot: false, turnstileToken };
}
/** @param {string} ip @param {string} key */
export function hashFormIp(ip, key) { return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32); }
/** @param {Request} request */
export function clientIp(request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"; }

/** @param {Request} request @returns {Promise<unknown>} */
export async function readFormBody(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw new StudyInterestError("Format permintaan tidak valid.", 415);
  const tooBig = () => new StudyInterestError("Isian terlalu panjang.", 413);
  if (Number(request.headers.get("content-length")) > MAX_STUDY_INTEREST_BYTES) throw tooBig();
  const chunks = []; let total = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length > MAX_STUDY_INTEREST_BYTES) { await reader.cancel(); throw tooBig(); }
      chunks.push(value); total += value.length;
    }
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new StudyInterestError("Format permintaan tidak valid.", 400); }
}

/** @param {string} token @param {string} secret @param {typeof fetch} [fetchImpl] */
export async function verifyTurnstile(token, secret, fetchImpl = fetch) {
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret, response: token }), signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    return json?.success === true;
  } catch { return false; }
}

/** @param {unknown} input @param {{ ipHash: string, turnstileSecret?: string, verifyTurnstile: (token: string, secret: string) => Promise<boolean>, checkRate: (form: string, ipHash: string, limit: number) => Promise<boolean>, insertLead: (row: object) => Promise<void> }} deps */
export async function submitStudyInterest(input, deps) {
  let lead;
  try { lead = parseStudyInterest(input); }
  catch (error) {
    if (error instanceof StudyInterestError) return { status: error.status, body: { error: error.message, field: error.field } };
    throw error;
  }
  if (lead.honeypot) return { status: 200, body: { success: true, message: SUCCESS } };
  const limited = { status: 429, body: { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." } };
  try {
    if (!(await deps.checkRate("study_interest_attempt", deps.ipHash, 20))) return limited;
    if (!deps.turnstileSecret) return { status: 503, body: { error: "Formulir sementara tidak tersedia." } };
    if (!lead.turnstileToken || !(await deps.verifyTurnstile(lead.turnstileToken, deps.turnstileSecret))) {
      return { status: 400, body: { error: "Verifikasi gagal, silakan coba lagi.", field: "turnstile" } };
    }
    if (!(await deps.checkRate("study_interest", deps.ipHash, 5))) return limited;
    await deps.insertLead({ name: lead.name, contact: lead.contact, message: lead.message, consent_version: STUDY_INTEREST_CONSENT_VERSION });
  } catch { return { status: 500, body: { error: GENERIC_ERROR_MESSAGE } }; }
  return { status: 201, body: { success: true, message: SUCCESS } };
}

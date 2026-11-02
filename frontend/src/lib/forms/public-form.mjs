// frontend/src/lib/forms/public-form.mjs
import { createHmac } from "node:crypto";
import { UserFacingError, GENERIC_ERROR_MESSAGE } from "../api/errors.mjs";

export const MAX_FORM_BYTES = 8192;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +()\-]+$/;

export class PublicFormError extends UserFacingError {
  /** @param {string} message @param {number} [status] @param {string} [field] */
  constructor(message, status = 400, field) { super(message); this.name = "PublicFormError"; this.status = status; this.field = field; }
}
/** @param {unknown} value @param {string} field @param {string} label @param {number} max @param {boolean} required */
export function formText(value, field, label, max, required) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new PublicFormError(`${label} tidak valid.`, 400, field);
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if (clean.includes("\0") || !clean.isWellFormed()) throw new PublicFormError(`${label} berisi karakter yang tidak diizinkan.`, 400, field);
  if (required && !clean) throw new PublicFormError(`${label} wajib diisi.`, 400, field);
  if (Array.from(clean).length > max) throw new PublicFormError(`${label} maksimal ${max.toLocaleString("id-ID")} karakter.`, 400, field);
  return clean;
}
/** @param {string} value */
export function isContact(value) {
  const digits = value.replace(/\D/g, "").length;
  return EMAIL.test(value) || (PHONE.test(value) && digits >= 8 && digits <= 15);
}
/** Checks shape and allow-listed keys; returns null when the honeypot is filled.
 * @param {unknown} input @param {string[]} keys @returns {Record<string, unknown> | null} */
export function formFields(input, keys) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PublicFormError("Format permintaan tidak valid.");
  const data = /** @type {Record<string, unknown>} */ (input);
  if (Object.keys(data).some((key) => !keys.includes(key))) throw new PublicFormError("Format permintaan tidak valid.");
  // Bots that fill the honeypot get the generic success before any field-level feedback.
  if (typeof data.website === "string" && data.website.trim() !== "") return null;
  return data;
}
/** @param {Record<string, unknown>} data */
export function turnstileToken(data) { return typeof data.turnstileToken === "string" ? data.turnstileToken : ""; }

/** @param {string} ip @param {string} key */
export function hashFormIp(ip, key) { return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32); }
/** @param {Request} request */
export function clientIp(request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"; }

/** @param {Request} request @returns {Promise<unknown>} */
export async function readFormBody(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw new PublicFormError("Format permintaan tidak valid.", 415);
  const tooBig = () => new PublicFormError("Isian terlalu panjang.", 413);
  if (Number(request.headers.get("content-length")) > MAX_FORM_BYTES) throw tooBig();
  const chunks = []; let total = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length > MAX_FORM_BYTES) { await reader.cancel(); throw tooBig(); }
      chunks.push(value); total += value.length;
    }
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new PublicFormError("Format permintaan tidak valid.", 400); }
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

/**
 * @param {unknown} input
 * @param {{ key: string, success: string, parse: (input: unknown) => { honeypot: boolean, turnstileToken?: string }, toRow: (parsed: any) => object }} form
 * @param {{ ipHash: string, turnstileSecret?: string, verifyTurnstile: (token: string, secret: string) => Promise<boolean>, checkRate: (form: string, ipHash: string, limit: number) => Promise<boolean>, insertRow: (row: object) => Promise<void> }} deps
 */
export async function submitPublicForm(input, form, deps) {
  let parsed;
  try { parsed = form.parse(input); }
  catch (error) {
    if (error instanceof PublicFormError) return { status: error.status, body: { error: error.message, field: error.field } };
    throw error;
  }
  if (parsed.honeypot) return { status: 200, body: { success: true, message: form.success } };
  const limited = { status: 429, body: { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." } };
  try {
    if (!(await deps.checkRate(`${form.key}_attempt`, deps.ipHash, 20))) return limited;
    if (!deps.turnstileSecret) return { status: 503, body: { error: "Formulir sementara tidak tersedia." } };
    if (!parsed.turnstileToken || !(await deps.verifyTurnstile(parsed.turnstileToken, deps.turnstileSecret))) {
      return { status: 400, body: { error: "Verifikasi gagal, silakan coba lagi.", field: "turnstile" } };
    }
    if (!(await deps.checkRate(form.key, deps.ipHash, 5))) return limited;
    await deps.insertRow(form.toRow(parsed));
  } catch { return { status: 500, body: { error: GENERIC_ERROR_MESSAGE } }; }
  return { status: 201, body: { success: true, message: form.success } };
}

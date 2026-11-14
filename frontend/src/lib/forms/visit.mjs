// frontend/src/lib/forms/visit.mjs
import { PublicFormError, formFields, formText, isContact, submitPublicForm, turnstileToken } from "./public-form.mjs";

export const VISIT_CONSENT_VERSION = "draft-2026-11-02";
export const VISIT_SUCCESS = "Terima kasih. Tim kami akan menghubungi Anda untuk menyambut kunjungan Anda.";
const KEYS = ["name", "contact", "visitDate", "partySize", "message", "consent", "website", "turnstileToken"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Asia/Makassar as YYYY-MM-DD. @param {Date} [now] */
export function makassarToday(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(now); }

/** @param {unknown} value @param {Date} now */
function visitDate(value, now) {
  if (value === undefined || value === "") return null;
  const date = typeof value === "string" && DATE.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || !date.toISOString().startsWith(String(value))) throw new PublicFormError("Tanggal kunjungan tidak valid.", 400, "visitDate");
  if (String(value) < makassarToday(now)) throw new PublicFormError("Tanggal kunjungan tidak boleh sudah lewat.", 400, "visitDate");
  return String(value);
}
/** @param {unknown} value */
function partySize(value) {
  if (value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 20) throw new PublicFormError("Jumlah orang antara 1 dan 20.", 400, "partySize");
  return value;
}

/** @param {unknown} input @param {Date} [now] */
export function parseVisit(input, now = new Date()) {
  const data = formFields(input, KEYS);
  if (!data) return { name: "", contact: "", visitDate: null, partySize: null, message: "", honeypot: true, turnstileToken: "" };
  const name = formText(data.name, "name", "Nama", 100, true);
  const contact = formText(data.contact, "contact", "Kontak", 254, true);
  if (!isContact(contact)) throw new PublicFormError("Isi nomor WhatsApp atau email yang valid.", 400, "contact");
  const date = visitDate(data.visitDate, now);
  const size = partySize(data.partySize);
  const message = formText(data.message, "message", "Pesan", 1000, false);
  if (data.consent !== true) throw new PublicFormError("Centang persetujuan untuk melanjutkan.", 400, "consent");
  return { name, contact, visitDate: date, partySize: size, message, honeypot: false, turnstileToken: turnstileToken(data) };
}

/** @param {unknown} input @param {Parameters<typeof submitPublicForm>[2] & { now?: Date }} deps */
export function submitVisit(input, deps) {
  return submitPublicForm(input, {
    key: "visit", success: VISIT_SUCCESS, parse: (value) => parseVisit(value, deps.now),
    /** @param {ReturnType<typeof parseVisit>} v */
    toRow: (v) => ({ name: v.name, contact: v.contact, visit_date: v.visitDate, party_size: v.partySize, message: v.message, consent_version: VISIT_CONSENT_VERSION }),
  }, deps);
}

// frontend/src/lib/forms/study-interest.mjs
import { PublicFormError, formFields, formText, isContact, submitPublicForm, turnstileToken } from "./public-form.mjs";

export { PublicFormError as StudyInterestError, MAX_FORM_BYTES as MAX_STUDY_INTEREST_BYTES, hashFormIp, clientIp, readFormBody, verifyTurnstile } from "./public-form.mjs";
export const STUDY_INTEREST_CONSENT_VERSION = "2026-10-29";
const KEYS = ["name", "contact", "message", "consent", "website", "turnstileToken"];
const SUCCESS = "Terima kasih. Tim kami akan menghubungi Anda.";

/** @param {unknown} input */
export function parseStudyInterest(input) {
  const data = formFields(input, KEYS);
  if (!data) return { name: "", contact: "", message: "", honeypot: true, turnstileToken: "" };
  const name = formText(data.name, "name", "Nama", 100, true);
  const contact = formText(data.contact, "contact", "Kontak", 254, true);
  if (!isContact(contact)) throw new PublicFormError("Isi nomor WhatsApp atau email yang valid.", 400, "contact");
  const message = formText(data.message, "message", "Pesan", 1000, false);
  if (data.consent !== true) throw new PublicFormError("Centang persetujuan untuk melanjutkan.", 400, "consent");
  return { name, contact, message, honeypot: false, turnstileToken: turnstileToken(data) };
}

const FORM = {
  key: "study_interest", success: SUCCESS, parse: parseStudyInterest,
  /** @param {ReturnType<typeof parseStudyInterest>} lead */
  toRow: (lead) => ({ name: lead.name, contact: lead.contact, message: lead.message, consent_version: STUDY_INTEREST_CONSENT_VERSION }),
};
/** @param {unknown} input @param {{ ipHash: string, turnstileSecret?: string, verifyTurnstile: (token: string, secret: string) => Promise<boolean>, checkRate: (form: string, ipHash: string, limit: number) => Promise<boolean>, insertLead: (row: object) => Promise<void> }} deps */
export async function submitStudyInterest(input, deps) {
  return submitPublicForm(input, FORM, { ...deps, insertRow: deps.insertLead });
}

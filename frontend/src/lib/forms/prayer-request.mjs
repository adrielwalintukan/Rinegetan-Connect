// frontend/src/lib/forms/prayer-request.mjs
import { PublicFormError, formFields, formText, isContact, submitPublicForm, turnstileToken } from "./public-form.mjs";

export const PRAYER_CONSENT_VERSION = "draft-2026-11-02";
export const PRAYER_SUCCESS = "Terima kasih. Permohonan doa Anda sudah kami terima.";
const KEYS = ["name", "contact", "request", "wantsContact", "consent", "website", "turnstileToken"];

/** @param {unknown} input */
export function parsePrayerRequest(input) {
  const data = formFields(input, KEYS);
  if (!data) return { name: "", contact: "", request: "", wantsContact: false, honeypot: true, turnstileToken: "" };
  const name = formText(data.name, "name", "Nama", 100, false);
  const contact = formText(data.contact, "contact", "Kontak", 254, false);
  if (contact && !isContact(contact)) throw new PublicFormError("Isi nomor WhatsApp atau email yang valid.", 400, "contact");
  const request = formText(data.request, "request", "Permohonan doa", 2000, true);
  if (data.wantsContact !== undefined && typeof data.wantsContact !== "boolean") throw new PublicFormError("Format permintaan tidak valid.");
  const wantsContact = data.wantsContact === true;
  if (wantsContact && !contact) throw new PublicFormError("Isi kontak agar kami dapat menghubungi Anda.", 400, "contact");
  if (data.consent !== true) throw new PublicFormError("Centang persetujuan untuk melanjutkan.", 400, "consent");
  return { name, contact, request, wantsContact, honeypot: false, turnstileToken: turnstileToken(data) };
}

const FORM = {
  key: "prayer", success: PRAYER_SUCCESS, parse: parsePrayerRequest,
  /** @param {ReturnType<typeof parsePrayerRequest>} p */
  toRow: (p) => ({ name: p.name, contact: p.contact, request: p.request, wants_contact: p.wantsContact, consent_version: PRAYER_CONSENT_VERSION }),
};
/** @param {unknown} input @param {Parameters<typeof submitPublicForm>[2]} deps */
export function submitPrayerRequest(input, deps) { return submitPublicForm(input, FORM, deps); }

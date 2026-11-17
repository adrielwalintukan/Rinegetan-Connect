// frontend/src/lib/notifications/subscription.mjs
// P5-003: turning a browser PushSubscription into the row the server stores.
//
// Owner decision 2026-11-17: the subscription identity is the device/browser push
// subscription. Nothing here accepts an email, a phone number or a name, and a body
// that carries one is refused rather than quietly trimmed, so the server can never
// start collecting contact details by accident.

import { PublicInputError } from "../api/errors.mjs";
import { CATEGORIES } from "./preferences.mjs";

const MAX_ENDPOINT = 2048;
const MAX_KEY = 512;
const SUBSCRIPTION_KEYS = ["endpoint", "keys", "categories"];
const STOP_KEYS = ["endpoint"];

/** A rejection written for the jemaat; the route turns it into a 400. */
export class SubscriptionError extends PublicInputError {
  /** @param {string} message @param {string} [field] */
  constructor(message, field) {
    super(message);
    this.name = "SubscriptionError";
    this.field = field;
  }
}

/** @param {unknown} value @returns {Record<string, unknown>} */
function objectBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SubscriptionError("Format permintaan tidak valid.");
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Only the keys the route understands may appear. An unexpected key is treated as
 * a mistake, not ignored, because silently dropping `email` would look like it worked.
 * @param {Record<string, unknown>} data
 * @param {string[]} allowed
 */
function allowOnly(data, allowed) {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) throw new SubscriptionError("Format permintaan tidak valid.");
  }
}

/** @param {unknown} value @param {string} label */
function requiredText(value, label) {
  if (typeof value !== "string") throw new SubscriptionError(`${label} tidak valid.`);
  const clean = value.trim();
  if (!clean) throw new SubscriptionError(`${label} wajib diisi.`);
  if (clean.includes("\0") || !clean.isWellFormed()) {
    throw new SubscriptionError(`${label} berisi karakter yang tidak diizinkan.`);
  }
  return clean;
}

/** @param {unknown} value */
function endpoint(value) {
  const clean = requiredText(value, "Alamat langganan");
  if (Array.from(clean).length > MAX_ENDPOINT) throw new SubscriptionError("Alamat langganan terlalu panjang.");
  if (!/^https:\/\/\S+$/i.test(clean)) {
    throw new SubscriptionError("Alamat langganan harus diawali https://.", "endpoint");
  }
  return clean;
}

/** @param {unknown} value @param {string} label */
function pushKey(value, label) {
  const clean = requiredText(value, label);
  if (Array.from(clean).length > MAX_KEY) throw new SubscriptionError(`${label} terlalu panjang.`);
  return clean;
}

/**
 * Keep the chosen categories, drop repeats, and always return them in the fixed
 * church order so two devices that chose the same thing look the same.
 * @param {unknown} value
 */
function categories(value) {
  if (!Array.isArray(value)) throw new SubscriptionError("Pilih minimal satu kategori notifikasi.", "categories");
  const chosen = new Set();
  for (const item of value) {
    if (typeof item !== "string" || !CATEGORIES.includes(item)) {
      throw new SubscriptionError("Kategori notifikasi tidak dikenal.", "categories");
    }
    chosen.add(item);
  }
  const ordered = CATEGORIES.filter((category) => chosen.has(category));
  if (ordered.length === 0) {
    throw new SubscriptionError("Pilih minimal satu kategori notifikasi.", "categories");
  }
  return ordered;
}

/**
 * @param {unknown} input
 * @param {string} consentVersion
 * @returns {{ endpoint: string, p256dh: string, auth: string, categories: string[], consent_version: string }}
 */
export function parseSubscription(input, consentVersion) {
  const data = objectBody(input);
  allowOnly(data, SUBSCRIPTION_KEYS);
  const keys = objectBody(data.keys);
  allowOnly(keys, ["p256dh", "auth"]);
  return {
    endpoint: endpoint(data.endpoint),
    p256dh: pushKey(keys.p256dh, "Kunci publik langganan"),
    auth: pushKey(keys.auth, "Kunci otentikasi langganan"),
    categories: categories(data.categories),
    consent_version: requiredText(consentVersion, "Versi persetujuan"),
  };
}

/**
 * @param {unknown} input
 * @returns {string}
 */
export function parseStopRequest(input) {
  const data = objectBody(input);
  allowOnly(data, STOP_KEYS);
  return endpoint(data.endpoint);
}

import { CONSENT_STATUSES } from "./consent.mjs";

export { CONSENT_STATUSES, isConsentStatus, recordConsent } from "./consent.mjs";
export type ConsentStatusInput = (typeof CONSENT_STATUSES)[number];

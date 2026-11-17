// frontend/src/lib/notifications/centre.ts
// Typed surface for the plain-JS module the tests load directly.
import * as centre from "./centre.mjs";

export type CategoryOption = { id: string; label: string; description: string };

export type CentreCopy = Record<
  "heading" | "intro" | "noAccount" | "identity" | "permission" | "stopAllHint" | "save" | "saving" | "stopAll",
  string
>;

export type SubscribeBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  categories: string[];
};

export const centreCopy = centre.centreCopy as CentreCopy;

export function categoryOptions(): CategoryOption[] {
  return centre.categoryOptions() as CategoryOption[];
}

export function canSubscribe(state: { hasPushManager: boolean; hasVapidKey: boolean }): {
  ok: boolean;
  reason: string;
} {
  return centre.canSubscribe(state) as { ok: boolean; reason: string };
}

export function toSubscribeBody(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  prefs: Record<string, boolean>,
): SubscribeBody {
  return centre.toSubscribeBody(subscription, prefs) as SubscribeBody;
}

export function toStopBody(endpoint: string): { endpoint: string } {
  return centre.toStopBody(endpoint) as { endpoint: string };
}

export function summaryText(prefs: Record<string, boolean>): string {
  return centre.summaryText(prefs) as string;
}

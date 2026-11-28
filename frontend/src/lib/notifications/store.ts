// frontend/src/lib/notifications/store.ts
// Typed surface for the plain-JS preference store the tests load directly.
import * as store from "./store.mjs";

export type PreferenceSnapshot = Record<string, boolean>;

export type PreferenceStore = {
  getSnapshot: () => PreferenceSnapshot;
  getServerSnapshot: () => PreferenceSnapshot;
  subscribe: (listener: () => void) => () => void;
  set: (next: PreferenceSnapshot) => void;
  clear: () => void;
};

type Storage = {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export const STORAGE_KEY = store.STORAGE_KEY as string;

export const preferenceStore = store.preferenceStore as PreferenceStore;

export function createPreferenceStore(storage: Storage | null): PreferenceStore {
  return store.createPreferenceStore(storage) as PreferenceStore;
}

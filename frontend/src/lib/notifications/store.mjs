// frontend/src/lib/notifications/store.mjs
// P5-003: the device's saved notification choice, read outside React.
//
// Reading localStorage in an effect and calling setState there makes React render twice
// and is rejected by the lint rules. An external store read through useSyncExternalStore
// is the supported shape: one stable server snapshot for hydration, then the real value.

import { emptyPreferences, normalizePreferences } from "./preferences.mjs";

export const STORAGE_KEY = "rinegetan-notifikasi";

/** The snapshot used while rendering on the server; it must be the same object every call. */
const SERVER_SNAPSHOT = Object.freeze(emptyPreferences());

/**
 * @param {{ getItem: (key: string) => string | null, setItem?: (key: string, value: string) => void, removeItem?: (key: string) => void } | null} storage
 */
export function createPreferenceStore(storage) {
  let snapshot = readSaved();
  const listeners = new Set();

  function readSaved() {
    if (!storage) return emptyPreferences();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyPreferences();
      return normalizePreferences(JSON.parse(raw));
    } catch {
      return emptyPreferences();
    }
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** @param {Record<string, boolean>} next */
    set(next) {
      snapshot = normalizePreferences(next);
      try {
        storage?.setItem?.(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // A blocked localStorage only costs the pre-filled choice, never the subscription.
      }
      emit();
    },
    clear() {
      snapshot = emptyPreferences();
      try {
        storage?.removeItem?.(STORAGE_KEY);
      } catch {
        // Same as above: the in-memory state is still correct.
      }
      emit();
    },
  };
}

/** The store the component uses in the browser. */
export const preferenceStore = createPreferenceStore(
  typeof window === "undefined" ? null : window.localStorage,
);

/** @typedef {{ version: 1, notes: Record<string, string> }} NotesState */

export const NOTES_STORAGE_KEY = "rinegetan:sabbath-notes:v1";

// One day of reflection, not an essay. Keeps a full quarter (~35 days) far below the storage quota.
export const NOTE_MAX_LENGTH = 4000;

const dayKey = /^\d{4}-0[1-4](?:-[a-z0-9]+)?\/\d{2}\/\d{2}$/;

/** @param {unknown} value @returns {value is string} */
function isKey(value) {
  return typeof value === "string" && dayKey.test(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {string} quarterId @param {string} lessonId @param {string} dayId */
export function noteKey(quarterId, lessonId, dayId) {
  return `${quarterId}/${lessonId}/${dayId}`;
}

/** @returns {NotesState} */
export function createNotesState() {
  return { version: 1, notes: {} };
}

/** Rebuild from scratch so browser metadata can never enter trusted state or storage.
 * @param {unknown} value @returns {NotesState}
 */
function parseNotesState(value) {
  const state = createNotesState();
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.notes)) return state;
  for (const [key, note] of Object.entries(value.notes)) {
    if (!isKey(key) || typeof note !== "string") continue;
    const trimmed = note.slice(0, NOTE_MAX_LENGTH);
    if (trimmed.trim()) state.notes[key] = trimmed;
  }
  return state;
}

/** @param {Pick<Storage, 'getItem'> | null} storage
 * @returns {{ state: NotesState, persistent: boolean }}
 */
export function readNotesState(storage) {
  let raw;
  try {
    if (!storage) return { state: createNotesState(), persistent: false };
    raw = storage.getItem(NOTES_STORAGE_KEY);
  } catch {
    return { state: createNotesState(), persistent: false };
  }
  try {
    return { state: parseNotesState(raw === null ? null : JSON.parse(raw)), persistent: true };
  } catch {
    return { state: createNotesState(), persistent: true };
  }
}

/** @param {Pick<Storage, 'setItem'> | null} storage @param {NotesState} state @returns {boolean} */
export function writeNotesState(storage, state) {
  try {
    if (!storage) return false;
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(parseNotesState(state)));
    return true;
  } catch {
    return false;
  }
}

/** @param {NotesState} state @param {string} key @returns {string} */
export function getNote(state, key) {
  return isKey(key) && typeof state.notes[key] === "string" ? state.notes[key] : "";
}

/** An empty note is deleted rather than stored, so cleared days leave no residue.
 * @param {NotesState} state @param {string} key @param {string} note @returns {NotesState}
 */
export function setNote(state, key, note) {
  if (!isKey(key) || typeof note !== "string") return state;
  const notes = { ...state.notes };
  const trimmed = note.slice(0, NOTE_MAX_LENGTH);
  if (trimmed.trim()) notes[key] = trimmed;
  else delete notes[key];
  return { version: 1, notes };
}

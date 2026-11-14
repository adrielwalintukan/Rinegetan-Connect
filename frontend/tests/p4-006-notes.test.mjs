import test from "node:test";
import assert from "node:assert/strict";

const notes = await import("../src/lib/sabbath/notes.mjs").catch(() => ({}));

const key = "2026-04/07/05";

function memory(initial = null) {
  let raw = initial;
  return { getItem: () => raw, setItem: (_k, value) => { raw = value; }, raw: () => raw };
}

test("a note round-trips per reading day", () => {
  assert.equal(typeof notes.setNote, "function");
  const state = notes.setNote(notes.createNotesState(), key, "Renungan Sabat pagi.");
  assert.equal(notes.getNote(state, key), "Renungan Sabat pagi.");
  assert.equal(notes.getNote(state, "2026-04/07/06"), "");
});

test("clearing a note deletes it instead of storing an empty entry", () => {
  const state = notes.setNote(notes.setNote(notes.createNotesState(), key, "Teks"), key, "   ");
  assert.deepEqual(state.notes, {});
  assert.equal(notes.getNote(state, key), "");
});

test("notes are capped and keys outside the reader shape are refused", () => {
  const long = notes.setNote(notes.createNotesState(), key, "a".repeat(notes.NOTE_MAX_LENGTH + 50));
  assert.equal(notes.getNote(long, key).length, notes.NOTE_MAX_LENGTH);
  for (const bad of ["", "2026-04", "2026-04/07", "evil/07/05", "2026-04/07/05/extra", null, 7]) {
    assert.deepEqual(notes.setNote(notes.createNotesState(), bad, "x").notes, {});
  }
});

test("storage survives a round trip and rejects foreign or malformed entries", () => {
  const storage = memory();
  assert.equal(notes.writeNotesState(storage, notes.setNote(notes.createNotesState(), key, "Simpan")), true);
  assert.equal(notes.getNote(notes.readNotesState(storage).state, key), "Simpan");

  const hostile = memory(JSON.stringify({ version: 1, notes: { [key]: "ok", "../evil": "x", "2026-04/07/06": 42 } }));
  assert.deepEqual(notes.readNotesState(hostile).state.notes, { [key]: "ok" });

  for (const raw of ["not json", "null", JSON.stringify({ version: 2, notes: {} }), JSON.stringify({ version: 1, notes: [] })]) {
    assert.deepEqual(notes.readNotesState(memory(raw)).state.notes, {});
  }
});

test("a browser that refuses storage degrades to a non-persistent session", () => {
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(notes.readNotesState(throwing), { state: notes.createNotesState(), persistent: false });
  assert.equal(notes.writeNotesState(throwing, notes.createNotesState()), false);
  assert.equal(notes.writeNotesState(null, notes.createNotesState()), false);
  assert.deepEqual(notes.readNotesState(null), { state: notes.createNotesState(), persistent: false });
});

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuarterly, normalizeLesson, normalizeSegment } from "../src/lib/sabbath/adventech.mjs";

const fixture = () => ({
  quarterly: {
    id: "2026-01", index: "id-2026-01", lang: "id", title: "Contoh",
    cover: "https://sabbath-school.adventech.io/synthetic-cover.jpg",
    credits: [{ name: "Sumber", value: "Contoh penerbit" }],
  },
  lessons: [
    { id: "01", index: "id-2026-01-01", title: "Satu" },
    { id: "02", index: "id-2026-01-02", title: "Dua" },
  ],
});

test("validates supported segment blocks without interpreting their markdown", () => {
  assert.deepEqual(normalizeSegment({ id: "1", index: "id-1", name: "Hari",
    blocks: [{ id: "p", type: "paragraph", markdown: "<script>contoh</script>" },
      { id: "h", type: "heading", markdown: "Judul", depth: 2 }] }), {
    id: "1", index: "id-1", name: "Hari",
    blocks: [{ id: "p", type: "paragraph", markdown: "<script>contoh</script>" },
      { id: "h", type: "heading", markdown: "Judul", depth: 2 }],
  });
});

test("preserves significant whitespace in source markdown", () => {
  const result = normalizeSegment({ id: "1", index: "id-1", name: "Hari",
    blocks: [{ id: "p", type: "paragraph", markdown: "  contoh\n" }] });
  assert.equal(result.blocks[0].markdown, "  contoh\n");
});

test("does not accept unsupported, incomplete or duplicate content blocks", () => {
  const segment = (blocks) => ({ id: "1", index: "id-1", name: "Hari", blocks });
  for (const blocks of [[], [{ id: "1", type: "image", src: "https://example.invalid/a" }],
    [{ id: "1", type: "paragraph", markdown: "" }],
    [{ id: "1", type: "heading", markdown: "a", depth: 7 }],
    [{ id: "1", type: "paragraph", markdown: "a" }, { id: "1", type: "paragraph", markdown: "b" }]]) {
    assert.throws(() => normalizeSegment(segment(blocks)));
  }
});

test("normalizes lesson days while keeping their verified source paths relative", () => {
  const input = { lesson: { id: "01", index: "id-2026-01-01", title: "Satu" },
    days: [{ id: "01", index: "id-2026-01-01-01", title: "Hari satu", read_path: "id/2026-01/01/01/read/index.json" }] };
  assert.deepEqual(normalizeLesson(input), {
    id: "01", index: "id-2026-01-01", title: "Satu",
    days: [{ id: "01", index: "id-2026-01-01-01", title: "Hari satu", readPath: "id/2026-01/01/01/read/index.json" }],
  });
});

test("rejects incomplete lesson days and paths that could escape the source", () => {
  for (const path of ["", "../private", "//example.invalid/x", "https://example.invalid/x", "a/%2e%2e/x", "a/../x", "a\\x"]) {
    assert.throws(() => normalizeLesson({ lesson: { id: "01", index: "id-2026-01-01", title: "Satu" },
      days: [{ id: "01", index: "day", title: "Hari", read_path: path }] }));
  }
  assert.throws(() => normalizeLesson({ lesson: { id: "01", index: "x", title: "Satu" }, days: [] }));
});

test("normalizes Indonesian quarterly metadata and preserves lesson order and attribution", () => {
  assert.deepEqual(normalizeQuarterly(fixture()), {
    id: "2026-01", index: "id-2026-01", language: "id", title: "Contoh",
    cover: "https://sabbath-school.adventech.io/synthetic-cover.jpg",
    credits: [{ name: "Sumber", value: "Contoh penerbit" }],
    lessons: [
      { id: "01", index: "id-2026-01-01", title: "Satu", position: 1 },
      { id: "02", index: "id-2026-01-02", title: "Dua", position: 2 },
    ],
  });
});

test("quarterly covers reject unapproved origins and credentials", () => {
  for (const cover of ["https://other-host.example/cover.jpg", "https://localhost/cover.jpg",
    "https://sabbath-school.adventech.io.evil.example/cover.jpg", "http://sabbath-school.adventech.io/cover.jpg",
    "https://sabbath-school.adventech.io:444/cover.jpg", "https://user@sabbath-school.adventech.io/cover.jpg"]) {
    const input = fixture();
    input.quarterly.cover = cover;
    assert.throws(() => normalizeQuarterly(input), cover);
  }
  const input = fixture();
  input.quarterly.cover = "https://sabbath-school.adventech.io:443/synthetic-cover.jpg";
  assert.equal(normalizeQuarterly(input).cover, "https://sabbath-school.adventech.io/synthetic-cover.jpg");
});

test("rejects incomplete or untrusted quarterly metadata", () => {
  for (const change of [
    (x) => { x.quarterly.lang = "en"; },
    (x) => { x.quarterly.id = "2026-02"; },
    (x) => { x.quarterly.credits = []; },
    (x) => { x.quarterly.cover = "javascript:alert(1)"; },
    (x) => { x.lessons[0].title = ""; },
    (x) => { x.lessons[1].index = x.lessons[0].index; },
    (x) => { x.lessons[1].id = x.lessons[0].id; },
    (x) => { x.lessons = []; },
  ]) {
    const input = fixture();
    change(input);
    assert.throws(() => normalizeQuarterly(input));
  }
});

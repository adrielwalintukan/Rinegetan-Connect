import test from "node:test";
import assert from "node:assert/strict";

const reader = await import("../src/lib/sabbath/reader.mjs").catch(() => ({}));
const quarterly = { id: "2026-04", index: "in-2026-04", lessons: [{ id: "07", index: "in-2026-04-07", title: "Lesson" }] };
const fixture = () => ({ lesson: { id: "07", index: "in-2026-04-07", title: "Lesson", start_date: "07/11/2026", end_date: "13/11/2026" },
  days: [{ id: "01", index: "in-2026-04-07-01", title: "Day one", date: "07/11/2026", read_path: "in/quarterlies/2026-04/lessons/07/days/01/read" },
    { id: "02", index: "in-2026-04-07-02", title: "Day two", date: "08/11/2026", read_path: "in/quarterlies/2026-04/lessons/07/days/02/read" }] });

test("reader normalizes an actual-shaped lesson retaining dates and order", () => {
  assert.equal(typeof reader.normalizeReaderLesson, "function");
  const result = reader.normalizeReaderLesson(fixture(), quarterly, "07");
  assert.equal(result.index, "in-2026-04-07");
  assert.deepEqual(result.days.map(d => [d.id, d.date]), [["01", "07/11/2026"], ["02", "08/11/2026"]]);
});

test("reader rejects unknown lessons, foreign identities, duplicate days, mismatched paths and impossible dates", () => {
  assert.equal(typeof reader.normalizeReaderLesson, "function");
  assert.throws(() => reader.normalizeReaderLesson(fixture(), quarterly, "08"));
  for (const change of [x => { x.lesson.index = "en-2026-04-07"; }, x => { x.days.push(x.days[0]); },
    x => { x.days[0].index = "in-2026-03-07-01"; }, x => { x.days[0].read_path = "https://evil.invalid/private"; },
    x => { x.days[0].date = "31/11/2026"; }, x => { x.days[0].date = "06/11/2026"; },
    x => { x.days[1].date = x.days[0].date; }, x => { x.lesson.title = "Other"; },
    x => { x.lesson.start_date = "01/01/2027"; }, x => { x.days.reverse(); }]) {
    const input = fixture(); change(input); assert.throws(() => reader.normalizeReaderLesson(input, quarterly, "07"));
  }
});

test("day content preserves readable semantic HTML without remote resources or active markup", () => {
  assert.equal(typeof reader.normalizeReaderDay, "function");
  const lesson = reader.normalizeReaderLesson(fixture(), quarterly, "07");
  const result = reader.normalizeReaderDay({ id: "01", index: "in-2026-04-07-01", date: "07/11/2026", title: "Day one",
    content: '<h1 id="x">Heading</h1><p onclick="evil()" style="color:red">A &amp; B <strong>bold</strong> <a class="verse" verse="x">John 1</a></p><code>  keep\n space </code><script>evil()</script><style>x{}</style><iframe src="https://evil.invalid"></iframe><svg><script>bad()</script></svg><img src="https://evil.invalid/x"><a href="https://example.org/read" target="_blank">Source</a>' }, lesson, "01");
  assert.equal(result.html, '<h2>Heading</h2><p>A &amp; B <strong>bold</strong> John 1</p><code>  keep\n space </code><a href="https://example.org/read" rel="noopener noreferrer">Source</a>');
});

test("day sanitizer rejects unsafe links and handles malformed markup as inert text", () => {
  assert.equal(typeof reader.normalizeReaderDay, "function");
  const lesson = reader.normalizeReaderLesson(fixture(), quarterly, "07");
  for (const href of ['javascript:alert(1)', 'data:text/html,evil', '//evil.invalid', 'http://example.org', 'https://user:pass@example.org']) {
    const day = reader.normalizeReaderDay({ ...lesson.days[0], content: `<p>Hello <a href="${href}">text</a><strong>end` }, lesson, "01");
    assert.equal(day.html, '<p>Hello text<strong>end</strong></p>');
  }
  for (const change of [x => { x.index = "en-2026-04-07-01"; }, x => { x.date = "08/11/2026"; },
    x => { x.title = "Wrong"; }, x => { x.content = "<script>evil()</script>"; }, x => { x.content = ""; }]) {
    const input = { ...lesson.days[0], content: "<p>text</p>" }; change(input);
    assert.throws(() => reader.normalizeReaderDay(input, lesson, "01"));
  }
});

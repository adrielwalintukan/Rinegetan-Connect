import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsxLoader } from "./load-tsx.mjs";
import { normalizeReaderDay } from "../../src/lib/sabbath/reader.mjs";

export function renderReaderFixtures() {
  const Reader = tsxLoader()("src/components/pages/SabbathReader.jsx").default;
  const days = [{ id: "01", index: "in-2026-04-07-01", title: "Hari pertama", date: "07/11/2026" },
    { id: "02", index: "in-2026-04-07-02", title: "Hari kedua", date: "08/11/2026" }];
  const lesson = { id: "07", title: "Pelajaran sintetis", days };
  const quarterly = { title: "Triwulan sintetis", lessons: [lesson], credits: [] };
  const snapshot = { status: "available", fetchedAt: "2026-11-11T00:00:00Z", sourceUrl: "https://sabbath-school.adventech.io/in/2026-04" };
  const render = props => renderToStaticMarkup(React.createElement("main", null, React.createElement(Reader, { quarterId: "2026-04", ...props })));
  const verse = '<h2>Matius 7:5</h2> <sup>5</sup> Hai orang munafik, keluarkanlah dahulu balok dari matamu.';
  return {
    "/sekolah-sabat/2026-04": render({ snapshot, quarterly }),
    "/sekolah-sabat/2026-04/07": render({ snapshot: { ...snapshot, data: lesson }, lessonId: "07" }),
    ...Object.fromEntries(days.map(day => [`/sekolah-sabat/2026-04/07/${day.id}`, render({ lessonId: "07", snapshot: { ...snapshot, lesson,
      data: normalizeReaderDay({ ...day, bible: [{ name: "ALKITAB", verses: { Matt75: verse,
        "Evil1": '<p onclick="x()">Ayat palsu</p><script>window.readerXss=true</script>' } }],
        content: `<h1>Judul bacaan</h1><p>Teks sintetis &amp; arti. Baca <a class="verse" verse="Matt75">Mat. 7: 5</a> dan <a class="verse" verse="Nope">Mrk 1: 1</a>.</p><table><thead><tr><th scope="col">Hari</th><th>Tema panjang ${"katapanjang".repeat(12)}</th></tr></thead><tbody><tr><td>Senin</td><td>Doa</td></tr></tbody></table><code>${"katapanjang".repeat(50)}</code><a href="javascript:alert(1)">Ayat</a><script>window.readerXss=true</script><img src="https://evil.invalid/x" onerror="window.readerXss=true">` }, lesson, day.id) } })])),
    "/reader-unavailable": render({ snapshot: { status: "unavailable" } }),
  };
}

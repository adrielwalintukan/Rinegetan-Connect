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
  return {
    "/sekolah-sabat/2026-04": render({ snapshot, quarterly }),
    "/sekolah-sabat/2026-04/07": render({ snapshot: { ...snapshot, data: lesson }, lessonId: "07" }),
    ...Object.fromEntries(days.map(day => [`/sekolah-sabat/2026-04/07/${day.id}`, render({ lessonId: "07", snapshot: { ...snapshot, lesson,
      data: normalizeReaderDay({ ...day, content: `<h1>Judul bacaan</h1><p>Teks sintetis &amp; arti.</p><code>${"katapanjang".repeat(50)}</code><a href="javascript:alert(1)">Ayat</a><script>window.readerXss=true</script><img src="https://evil.invalid/x" onerror="window.readerXss=true">` }, lesson, day.id) } })])),
    "/reader-unavailable": render({ snapshot: { status: "unavailable" } }),
  };
}

// Test-only upstream stub. Preloaded into the Next server process so the real reader page can
// render and hydrate without touching the network. No product code is modified.
const ORIGIN = "https://sabbath-school.adventech.io/api/v2/in/quarterlies/";

const quarter = {
  quarterly: { id: "2026-04", index: "in-2026-04", lang: "in", title: "Triwulan sintetis",
    start_date: "26/09/2026", end_date: "25/12/2026", human_date: "Oktober–Desember 2026",
    cover: `${ORIGIN}2026-04/cover.png` },
  lessons: [{ id: "07", index: "in-2026-04-07", title: "Pelajaran sintetis" }],
};

const lesson = {
  lesson: { id: "07", index: "in-2026-04-07", title: "Pelajaran sintetis", start_date: "07/11/2026", end_date: "13/11/2026" },
  days: [
    { id: "05", index: "in-2026-04-07-05", title: "Hari pertama", date: "07/11/2026",
      read_path: "in/quarterlies/2026-04/lessons/07/days/05/read" },
    { id: "06", index: "in-2026-04-07-06", title: "Hari kedua", date: "08/11/2026",
      read_path: "in/quarterlies/2026-04/lessons/07/days/06/read" },
  ],
};

function day(id, date, title) {
  return { id, index: `in-2026-04-07-${id}`, date, title,
    content: `<p>Bacaan ${title}. Baca <a class="verse" verse="Matt75">Mat. 7: 5</a>.</p>`,
    bible: [{ name: "ALKITAB", verses: { Matt75: "Hai orang munafik, keluarkanlah dahulu balok dari matamu." } }] };
}

const routes = new Map([
  ["index.json", []],
  ["2026-04/index.json", quarter],
  ["2026-04/lessons/07/index.json", lesson],
  ["2026-04/lessons/07/days/05/read/index.json", day("05", "07/11/2026", "Hari pertama")],
  ["2026-04/lessons/07/days/06/read/index.json", day("06", "08/11/2026", "Hari kedua")],
]);

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url ?? String(input);
  if (url.startsWith(ORIGIN)) {
    const key = url.slice(ORIGIN.length);
    if (routes.has(key)) {
      return new Response(JSON.stringify(routes.get(key)), {
        status: 200,
        headers: { "content-type": "application/json", etag: `"stub-${key.replace(/\W/g, "-")}"` },
      });
    }
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
  }
  return realFetch(input, init);
};

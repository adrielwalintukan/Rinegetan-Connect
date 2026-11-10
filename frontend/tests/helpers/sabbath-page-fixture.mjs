import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsxLoader } from "./load-tsx.mjs";

export function renderSabbathFixture(available) {
  const Page = tsxLoader()("src/components/pages/SekolahSabatPage.jsx").default;
  return renderToStaticMarkup(React.createElement(Page, { initialSchedules: [], catalog: {
    status: available ? "available" : "unavailable", classes: available ? [{ classId: "adult", label: "Dewasa",
      quarterly: { id: "2026-04", title: "JudulSintetisTanpaSpasi".repeat(20),
        credits: [{ name: "Atribusi sintetis", value: "SumberSintetisTanpaSpasi".repeat(20) }], lessons: [{ id: "01" }] },
      period: "26/09/2026–25/12/2026", sourceUrl: "https://sabbath-school.adventech.io/in/2026-04",
      fetchedAt: "2026-11-10T00:00:00Z" }] : [],
  } }));
}

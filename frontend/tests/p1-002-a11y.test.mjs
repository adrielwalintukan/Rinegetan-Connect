import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(resolve(frontendRoot, path), "utf8");

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("amber text tokens meet WCAG AA on the light surfaces they are used on", () => {
  // Scope to the sabbath palette: the navy palette above it also defines 600/700.
  const palette = read("tailwind.config.ts").match(/sabbath: \{([^}]*)\}/)[1];
  const shade = (n) => palette.match(new RegExp(`\\b${n}: "(#[0-9A-Fa-f]{6})"`))[1];
  assert.equal(shade(500), "#E5A93C", "parsed the sabbath palette");
  // Background, sabbath-50 and sabbath-100 surfaces.
  for (const surface of ["#FCFAF8", "#FDF8EE", "#FBF0DA"]) {
    assert.ok(contrast(shade(600), surface) >= 4.5, `sabbath-600 on ${surface}`);
    assert.ok(contrast(shade(700), surface) >= 4.5, `sabbath-700 on ${surface}`);
  }
});

test("darker text tokens do not recolour the official church symbol", () => {
  for (const file of ["src/components/layout/CreationGrid.jsx", "src/components/sections/Hero.jsx"]) {
    assert.match(read(file), /<(span|div) className="text-\[#C98F26\]">\s*<AdventistSymbol/, file);
  }
});

test("focus ring keeps 3:1 against light surfaces and navy", () => {
  const ring = read("src/app/globals.css").match(/:focus-visible \{\s+outline: 2px solid (#[0-9a-f]{6})/)[1];
  for (const surface of ["#FCFAF8", "#FFFFFF", "#FBF0DA", "#0A2540"]) {
    assert.ok(contrast(ring, surface) >= 3, `focus ring on ${surface}`);
  }
});

test("reduced motion skips every framer-motion animation and the scroll parallax on public pages", () => {
  const runtime = read("src/components/runtime/PublicClientRuntime.tsx");
  assert.match(runtime, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\) \{\s+MotionGlobalConfig\.skipAnimations = true;/);
  assert.match(read("src/app/(public)/layout.tsx"), /<PublicClientRuntime \/>/);
  assert.match(read("src/components/sections/Hero.jsx"), /motion-reduce:!\[transform:none\]/);
});

test("every public page has exactly one h1 page title", () => {
  assert.match(read("src/components/sections/ChapterHeading.jsx"), /as: Heading = "h2"/);
  for (const page of ["KegiatanPage.jsx", "KontakPage.jsx", "MediaPage.tsx", "PelayananPage.jsx", "SekolahSabatPage.jsx", "TentangKamiPage.jsx"]) {
    const source = read(`src/components/pages/${page}`);
    assert.equal(source.match(/<ChapterHeading as="h1"/g)?.length, 1, page);
  }
});

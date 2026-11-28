import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { tsxLoader } from "./helpers/load-tsx.mjs";

const link = { __esModule: true, default: ({ children, prefetch, ...props }) => { void prefetch; return React.createElement("a", props, children); } };
const loader = (pathname) => tsxLoader({ "next/navigation": { usePathname: () => pathname, useRouter: () => ({}) }, "next/link": link });

test("header: three closed dropdown groups, amber CTA, no search, transparent only on home", () => {
  const home = render(React.createElement(loader("/")("src/components/layout/GlobalNav.jsx").GlobalNav));
  for (const id of ["tentang", "ibadah-belajar", "kegiatan-media"]) {
    assert.match(home, new RegExp(`data-testid="nav-group-${id}"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*data-testid="nav-group-${id}"`));
  }
  assert.match(home, /data-nav-tone="transparent"/);
  assert.match(home, /data-testid="nav-utility-menu"/);
  assert.match(home, /href="\/pelajari-alkitab"[^>]*data-testid="nav-cta-pelajari-alkitab"[^>]*class="[^"]*bg-sabbath-500/);
  assert.doesNotMatch(home, /SEARCH|>Cari</);

  const other = render(React.createElement(loader("/kontak")("src/components/layout/GlobalNav.jsx").GlobalNav));
  assert.match(other, /data-nav-tone="solid"/);
});

test("hero is full-bleed and keeps its tested hooks", () => {
  const html = render(React.createElement(loader("/")("src/components/sections/Hero.jsx").Hero));
  assert.match(html, /data-testid="hero"[^>]*class="[^"]*min-h-\[100svh\]/);
  assert.match(html, /data-testid="hero-image-frame"[\s\S]*?<img[^>]*alt="[^"]+"/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /data-testid="hero-cta-sekolah-sabat"/);
  assert.match(html, /data-testid="hero-cta-jadwal-ibadah"/);
});

test("action cards: visit, prayer, bible order, each a photo card over a wave section", () => {
  const html = render(React.createElement(loader("/")("src/components/sections/DigitalMinistrySection.jsx").DigitalMinistrySection));
  const order = [...html.matchAll(/data-testid="ministry-card-([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["pertama-kali-berkunjung", "permohonan-doa", "pelajari-alkitab"]);
  assert.match(html, />Kunjungi Gereja</);
  assert.equal((html.match(/<img[^>]*alt="[^"]+"/g) || []).length, 3);
  assert.match(html, /data-testid="wave-edge"/);
});

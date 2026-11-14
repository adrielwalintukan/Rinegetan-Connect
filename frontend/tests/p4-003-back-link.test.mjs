import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsxLoader } from "./helpers/load-tsx.mjs";

const BackLink = tsxLoader()("src/components/ui/BackLink.jsx").default;

test("back links pair a decorative arrow with visible text for both links and buttons", () => {
  const link = renderToStaticMarkup(React.createElement(BackLink, { href: "/sekolah-sabat" }, "Kembali ke Sekolah Sabat"));
  assert.match(link, /<a[^>]*href="\/sekolah-sabat"/);
  assert.match(link, /<svg[^>]*aria-hidden="true"/);
  assert.match(link, /Kembali ke Sekolah Sabat/);
  assert.doesNotMatch(link, /<button/);

  const button = renderToStaticMarkup(React.createElement(BackLink, { onClick: () => {} }, "Kembali ke daftar course"));
  assert.match(button, /<button[^>]*type="button"/);
  assert.match(button, /<svg[^>]*aria-hidden="true"/);
  assert.match(button, /Kembali ke daftar course/);
});

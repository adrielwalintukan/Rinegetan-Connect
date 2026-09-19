import test from "node:test";
import assert from "node:assert/strict";
import { getSiteSectionMedia, triggerPublicRevalidation } from "../src/lib/public/queries.mjs";

test("site section media: exports getSiteSectionMedia query function", () => {
  assert.equal(typeof getSiteSectionMedia, "function");
});

test("site section media: triggerPublicRevalidation supports site_section_media", async () => {
  const revalidatedTags = [];
  const revalidatedPaths = [];

  const mockHooks = {
    revalidateTag: (tag) => revalidatedTags.push(tag),
    revalidatePath: (path) => revalidatedPaths.push(path),
  };

  triggerPublicRevalidation("site_section_media", mockHooks);

  assert.ok(revalidatedTags.includes("site-section-media"));
  assert.ok(revalidatedPaths.includes("/"));
  assert.ok(revalidatedPaths.includes("/sekolah-sabat"));
  assert.ok(revalidatedPaths.includes("/tentang-kami"));
});

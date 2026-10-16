import test from "node:test";
import assert from "node:assert/strict";
import { ZipArchive } from "archiver";

test("archive generation: creates valid zip stream from in-memory buffers", async () => {
  const archive = new ZipArchive({ zlib: { level: 5 } });
  const chunks = [];

  archive.on("data", (chunk) => chunks.push(chunk));

  const endPromise = new Promise((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  archive.append("Test content", { name: "README.txt" });
  archive.append(Buffer.from([0xff, 0xd8, 0xff]), { name: "test.jpg" });
  archive.finalize();

  await endPromise;
  const result = Buffer.concat(chunks);
  assert.ok(result.length > 0);
  // Check ZIP signature (PK..)
  assert.equal(result[0], 0x50);
  assert.equal(result[1], 0x4b);
});

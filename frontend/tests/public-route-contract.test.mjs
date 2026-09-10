import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const contractScript = fileURLToPath(
  new URL("../scripts/assert-public-route-contract.mjs", import.meta.url),
);

test("public route contract accepts a built App Router manifest", () => {
  const result = spawnSync(process.execPath, [contractScript], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `Route contract failed:\n${result.stderr || result.stdout}`,
  );
});

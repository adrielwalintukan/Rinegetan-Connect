import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const requiredFiles = [
  "src/data/content.js",
  "src/lib/utils.js",
  "src/components/identity/AdventistSymbol.jsx",
  "src/components/identity/EntityLockup.jsx",
  "src/components/layout/CreationGrid.jsx",
  "src/components/layout/PageShell.jsx",
  "src/components/layout/GlobalNav.jsx",
  "src/components/layout/GlobalFooter.jsx",
  "src/components/motion/KineticLines.jsx",
  "src/components/motion/Reveal.jsx",
  "src/components/runtime/PublicClientRuntime.tsx",
  "public/adventist-symbol.svg",
];
const forbiddenRuntimeTokens = [
  "react-router-dom",
  "react-scripts",
  "@craco/craco",
  "BrowserRouter",
  "NavLink",
];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("Phase 1 presentation is present without the legacy client runtime", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(
      existsSync(join(projectRoot, relativePath)),
      `Sumber presentasi belum dipindahkan: ${relativePath}`,
    );
  }

  const manifest = readFileSync(join(projectRoot, "package.json"), "utf8");
  const source = sourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  for (const token of forbiddenRuntimeTokens) {
    assert.equal(manifest.includes(token) || source.includes(token), false, token);
  }
});

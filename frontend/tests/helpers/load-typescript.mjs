import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Load the TypeScript entry used by the app, with network boundaries supplied by each test.
export async function loadTypeScript(relativePath) {
  const sourceUrl = new URL(`../../${relativePath}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    fileName: fileURLToPath(sourceUrl),
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const source = outputText.replace(/(from\s+["'])([^"']+)(["'])/g, (match, before, specifier, after) => {
    if (specifier.startsWith(".")) return `${before}${new URL(specifier, sourceUrl).href}${after}`;
    if (specifier === "@/lib/api/errors") return `${before}${new URL("../../src/lib/api/errors.mjs", import.meta.url).href}${after}`;
    return match;
  });
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated from src/lib/pwa/shell.mjs by scripts/generate-sw.mjs and asserted by
    // tests/p5-001-pwa.test.mjs; linting the generated copy would only duplicate that check.
    "public/sw.js",
  ]),
]);

export default eslintConfig;

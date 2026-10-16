import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const expectedRoutes = [
  "/",
  "/tentang-kami",
  "/kegiatan",
  "/media",
  "/pelayanan",
  "/sekolah-sabat",
  "/kontak",
];

const manifestPath = resolve(".next/server/app-paths-manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error("Jalankan next build sebelum test:routes.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const builtRoutes = new Set(
  Object.keys(manifest)
    .filter((route) => route.endsWith("/page"))
    .map((route) => route.replace(/\/\([^/]+\)/g, ""))
    .map((route) => route.slice(0, -"/page".length) || "/"),
);
const missingRoutes = expectedRoutes.filter((route) => !builtRoutes.has(route));

if (missingRoutes.length > 0) {
  throw new Error(`Route publik belum dibangun: ${missingRoutes.join(", ")}`);
}

console.log(`Kontrak rute publik lulus: ${expectedRoutes.join(", ")}`);

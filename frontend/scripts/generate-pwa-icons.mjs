// PWA icons are derived from public/icon.svg so the brand mark keeps one source of truth.
// Run with: node scripts/generate-pwa-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const publicDir = resolve(import.meta.dirname, "../public");
const source = readFileSync(resolve(publicDir, "icon.svg"));

const outputs = [
  { file: "icon-512.png", size: 512 },
  { file: "apple-icon-180.png", size: 180 },
];

for (const { file, size } of outputs) {
  const png = await sharp(source, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(resolve(publicDir, file), png);
  console.log(`${file}: ${size}x${size}, ${png.length} bytes`);
}

// The maskable variant pads the artwork onto a navy canvas instead of scaling it up, so the
// rounded background of the source icon does not show as a second rounded rectangle.
const inset = await sharp(source, { density: 384 }).resize(410, 410).png().toBuffer();
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0A2540" },
})
  .composite([{ input: inset, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(resolve(publicDir, "icon-maskable-512.png"), maskable);
console.log(`icon-maskable-512.png: 512x512, ${maskable.length} bytes`);

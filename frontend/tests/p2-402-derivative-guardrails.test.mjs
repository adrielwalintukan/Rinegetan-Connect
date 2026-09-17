import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  ALLOWED_MIME_TYPES,
  MAX_PIXEL_DIMENSION,
  MAX_TOTAL_PIXELS,
  MAX_UPLOAD_BYTES,
  STORAGE_CAPACITY_BYTES,
  getStorageQuotaMetrics,
  validateUploadGuardrails,
} from "../src/lib/media/guardrails.mjs";
import { createJpegDerivative } from "../src/lib/media/derivative.mjs";

test("getStorageQuotaMetrics computes quota thresholds accurately", () => {
  // Safe (< 70%)
  const safeMetrics = getStorageQuotaMetrics(500 * 1024 * 1024); // 500 MB
  assert.equal(safeMetrics.totalCapacityBytes, 1073741824);
  assert.equal(safeMetrics.isWarning, false);
  assert.equal(safeMetrics.isFrozen, false);
  assert.equal(safeMetrics.isExceeded, false);

  // Warning (>= 70% and < 85%)
  const warningBytes = Math.floor(STORAGE_CAPACITY_BYTES * 0.72);
  const warningMetrics = getStorageQuotaMetrics(warningBytes);
  assert.equal(warningMetrics.isWarning, true);
  assert.equal(warningMetrics.isFrozen, false);
  assert.equal(warningMetrics.isExceeded, false);

  // Frozen (>= 85% and < 100%)
  const frozenBytes = Math.floor(STORAGE_CAPACITY_BYTES * 0.88);
  const frozenMetrics = getStorageQuotaMetrics(frozenBytes);
  assert.equal(frozenMetrics.isWarning, true);
  assert.equal(frozenMetrics.isFrozen, true);
  assert.equal(frozenMetrics.isExceeded, false);

  // Exceeded (>= 100%)
  const exceededMetrics = getStorageQuotaMetrics(STORAGE_CAPACITY_BYTES + 1024);
  assert.equal(exceededMetrics.isWarning, true);
  assert.equal(exceededMetrics.isFrozen, true);
  assert.equal(exceededMetrics.isExceeded, true);
  assert.equal(exceededMetrics.remainingBytes, 0);
});

test("validateUploadGuardrails rejects invalid MIME types", async () => {
  const dummyBuffer = Buffer.from("not an image");
  const result = await validateUploadGuardrails(dummyBuffer, "image/gif", dummyBuffer.length);
  assert.equal(result.valid, false);
  assert.equal(result.error, "invalid_file_type");
});

test("validateUploadGuardrails rejects files exceeding 15 MB", async () => {
  const dummyBuffer = Buffer.alloc(100);
  const result = await validateUploadGuardrails(
    dummyBuffer,
    "image/jpeg",
    MAX_UPLOAD_BYTES + 1
  );
  assert.equal(result.valid, false);
  assert.equal(result.error, "file_too_large");
});

test("validateUploadGuardrails rejects corrupt or unreadable image buffers", async () => {
  const corruptBuffer = Buffer.from("totally corrupt data pretending to be jpeg");
  const result = await validateUploadGuardrails(corruptBuffer, "image/jpeg", corruptBuffer.length);
  assert.equal(result.valid, false);
  assert.equal(result.error, "invalid_image_buffer");
});

test("validateUploadGuardrails rejects images exceeding dimension limits", async () => {
  // Mock image with dimension > 6000px
  const largeBuffer = await sharp({
    create: {
      width: 6001,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  const result = await validateUploadGuardrails(largeBuffer, "image/jpeg", largeBuffer.length);
  assert.equal(result.valid, false);
  assert.equal(result.error, "dimensions_exceeded");
});

test("validateUploadGuardrails accepts valid images within limits", async () => {
  const validBuffer = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 50, g: 150, b: 250 },
    },
  })
    .jpeg()
    .toBuffer();

  const result = await validateUploadGuardrails(validBuffer, "image/jpeg", validBuffer.length);
  assert.equal(result.valid, true);
  assert.equal(result.width, 1200);
  assert.equal(result.height, 800);
});

test("createJpegDerivative downsizes large images and strips EXIF metadata", async () => {
  // Input: 2400 x 1200 PNG
  const rawBuffer = await sharp({
    create: {
      width: 2400,
      height: 1200,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();

  const derivative = await createJpegDerivative(rawBuffer);

  assert.equal(derivative.mimeType, "image/jpeg");
  assert.ok(derivative.bytes > 0);
  assert.ok(derivative.bytes === derivative.buffer.length);
  // Bounding box max 1920: 2400x1200 should scale to 1920x960
  assert.equal(derivative.width, 1920);
  assert.equal(derivative.height, 960);

  // Inspect output metadata to verify EXIF/GPS absence
  const outMeta = await sharp(derivative.buffer).metadata();
  assert.equal(outMeta.format, "jpeg");
  assert.equal(outMeta.exif, undefined);
  assert.equal(outMeta.iptc, undefined);
  assert.equal(outMeta.xmp, undefined);
});

test("createJpegDerivative preserves smaller dimensions without enlargement", async () => {
  // Input: 800 x 600
  const smallBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 30, g: 60, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();

  const derivative = await createJpegDerivative(smallBuffer);

  assert.equal(derivative.width, 800);
  assert.equal(derivative.height, 600);
  assert.equal(derivative.mimeType, "image/jpeg");
});


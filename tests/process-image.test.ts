import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { processImage } from "../lib/process-image";

test("image processing respects orientation and strips metadata while producing WebP", async () => {
  const input = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#bc735a" } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await processImage(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 40);
  assert.equal(metadata.height, 80);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
});

test("image processing downsizes large images without relying on a filesystem", async () => {
  const input = await sharp({ create: { width: 3000, height: 30, channels: 3, background: "#7793a4" } }).png().toBuffer();
  const metadata = await sharp(await processImage(input)).metadata();
  assert.equal(metadata.width, 2400);
  assert.equal(metadata.height, 24);
  await assert.rejects(() => processImage(Buffer.from("not an image")));
});

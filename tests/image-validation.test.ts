import assert from "node:assert/strict";
import { test } from "node:test";
import { detectImageType, isMediaFilename } from "../lib/image-validation";

test("image format is inferred from bytes rather than extensions or MIME headers", () => {
  assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "jpeg");
  assert.equal(detectImageType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "png");
  assert.equal(detectImageType(Buffer.from("RIFF0000WEBP")), "webp");
  for (const body of ["<svg onload='alert(1)'>", "GIF89a", "<html>", "", "RIFF"]) assert.equal(detectImageType(Buffer.from(body)), null);
});
test("media routes only serve generated WebP names", () => {
  assert.equal(isMediaFilename("00000000-0000-4000-8000-000000000001.webp"), true);
  for (const name of ["../.env", "a.webp", "00000000-0000-4000-8000-000000000001.svg", "/etc/passwd", "..%2f.env", "C:\\secret"]) assert.equal(isMediaFilename(name), false);
});

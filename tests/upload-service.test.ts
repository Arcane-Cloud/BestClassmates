import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../lib/errors";
import { MAX_IMAGE_BYTES } from "../lib/image-validation";
import { completeUpload, issueUpload, type UploadRecord, type UploadRepository, type UploadStorage } from "../lib/upload-service";

const id = "00000000-0000-4000-8000-000000000001";
const adminId = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-06T12:00:00Z");
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

function fixture() {
  const record: UploadRecord = { id, adminId, expectedBytes: png.length, mimeType: "image/png", expiresAt: new Date(now.valueOf() + 60000), completedAt: null };
  const records = new Map([[id, record]]);
  const finalBlobs = new Map<string, Buffer>();
  let downloads = 0;
  let writes = 0;
  const repository: UploadRepository = {
    async create(value) { records.set(value.id, value); },
    async find(key) { return records.get(key) ?? null; },
    async complete(key, when) { records.get(key)!.completedAt = when; },
  };
  const storage: UploadStorage = {
    authorize: (key) => ({ url: `https://example.blob.core.windows.net/media/incoming/${key}?sp=c`, expiresAt: new Date(now.valueOf() + 300000).toISOString() }),
    async finalExists(key) { return finalBlobs.has(key); },
    async originalProperties() { return { size: png.length, contentType: "image/png", etag: '"original-etag"' }; },
    async downloadOriginal(_key, size, etag) { downloads++; assert.equal(size, png.length); assert.equal(etag, '"original-etag"'); return png; },
    async writeFinal(key, bytes) { if (!finalBlobs.has(key)) { writes++; finalBlobs.set(key, bytes); } },
  };
  return { record, records, finalBlobs, repository, storage, downloads: () => downloads, writes: () => writes };
}
const encode = async () => Buffer.from("trusted-webp-output");
const hasStatus = (status: number) => (error: unknown) => error instanceof HttpError && error.status === status;

test("upload authorization validates metadata and binds the intent to an administrator", async () => {
  const f = fixture();
  const ticket = await issueUpload(adminId, { size: 123, type: "image/jpeg" }, f.repository, f.storage, now);
  const record = f.records.get(ticket.uploadId)!;
  assert.equal(record.adminId, adminId);
  assert.equal(record.expectedBytes, 123);
  assert.equal(record.mimeType, "image/jpeg");
  assert.equal(record.expiresAt.valueOf() - now.valueOf(), 15 * 60000);
  await assert.rejects(() => issueUpload(adminId, { size: MAX_IMAGE_BYTES + 1, type: "image/png" }, f.repository, f.storage));
  await assert.rejects(() => issueUpload(adminId, { size: 12, type: "image/svg+xml" }, f.repository, f.storage));
  await assert.rejects(() => issueUpload(adminId, { size: 12, type: "image/png", blobUrl: "https://untrusted.example" }, f.repository, f.storage));
});

test("another administrator and missing intents cannot inspect or complete an upload", async () => {
  const f = fixture();
  await assert.rejects(() => completeUpload("another-admin", id, f.repository, f.storage, encode, now), hasStatus(404));
  await assert.rejects(() => completeUpload(adminId, "00000000-0000-4000-8000-000000000003", f.repository, f.storage, encode, now), hasStatus(404));
  assert.equal(f.downloads(), 0);
  assert.equal(f.writes(), 0);
});

test("expired intents without a completed image are rejected", async () => {
  const f = fixture(); f.record.expiresAt = new Date(now.valueOf() - 1);
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, encode, now), hasStatus(410));
  assert.equal(f.downloads(), 0);
});

test("actual size and type are checked before downloading", async () => {
  const f = fixture();
  f.storage.originalProperties = async () => ({ size: MAX_IMAGE_BYTES + 1, contentType: "image/png", etag: "x" });
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, encode, now), hasStatus(422));
  f.storage.originalProperties = async () => ({ size: png.length, contentType: "image/jpeg", etag: "x" });
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, encode, now), hasStatus(422));
  assert.equal(f.downloads(), 0);
});

test("truncation, forged signatures and invalid decoding never produce a final blob", async () => {
  const f = fixture();
  f.storage.downloadOriginal = async () => png.subarray(0, 4);
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, encode, now), hasStatus(422));
  f.storage.downloadOriginal = async () => Buffer.alloc(png.length, 0);
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, encode, now), hasStatus(415));
  f.storage.downloadOriginal = async () => png;
  await assert.rejects(() => completeUpload(adminId, id, f.repository, f.storage, async () => { throw new Error("decode failed"); }, now), hasStatus(422));
  assert.equal(f.writes(), 0);
});

test("successful completion returns a stable URL and repeated completion is idempotent", async () => {
  const f = fixture();
  const first = await completeUpload(adminId, id, f.repository, f.storage, encode, now);
  const second = await completeUpload(adminId, id, f.repository, f.storage, encode, now);
  assert.deepEqual(first, { url: `/media/${id}.webp` });
  assert.deepEqual(first, second);
  assert.equal(f.downloads(), 1);
  assert.equal(f.writes(), 1);
  assert.ok(f.record.completedAt);
});

test("completion recovers after a function stopped between Blob write and DB update", async () => {
  const f = fixture();
  const original = Buffer.from("already-sanitized");
  f.finalBlobs.set(id, original);
  f.record.expiresAt = new Date(now.valueOf() - 1);
  await completeUpload(adminId, id, f.repository, f.storage, encode, now);
  assert.equal(f.finalBlobs.get(id), original);
  assert.ok(f.record.completedAt);
  assert.equal(f.downloads(), 0);
  assert.equal(f.writes(), 0);
});

test("concurrent completion converges on one immutable final object", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([
    completeUpload(adminId, id, f.repository, f.storage, encode, now),
    completeUpload(adminId, id, f.repository, f.storage, encode, now),
  ]);
  assert.deepEqual(a, b);
  assert.equal(f.finalBlobs.size, 1);
  assert.equal(f.writes(), 1);
});

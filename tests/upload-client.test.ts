import assert from "node:assert/strict";
import { test } from "node:test";
import { completeImageUpload, uploadImage, UploadCompletionError } from "../lib/upload-client";

const id = "00000000-0000-4000-8000-000000000001";
const file = () => new File([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], "photo.png", { type: "image/png" });
const ticket = { uploadId: id, uploadUrl: `https://example.blob.core.windows.net/private/incoming/${id}?sp=c`, expiresAt: "2026-10-06T12:05:00Z" };

test("browser sends only JSON to the app and sends the file directly to Azure without cookies", async () => {
  const stages: string[] = [];
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (calls.length === 1) return Response.json(ticket, { status: 201 });
    if (calls.length === 2) return new Response(null, { status: 201 });
    return Response.json({ url: `/media/${id}.webp` });
  };
  const image = file();
  const url = await uploadImage(image, (stage) => stages.push(stage), fetcher);
  assert.equal(url, `/media/${id}.webp`);
  assert.deepEqual(stages, ["authorizing", "uploading", "processing"]);
  assert.equal(calls[0].url, "/api/uploads");
  assert.deepEqual(JSON.parse(calls[0].init!.body as string), { size: image.size, type: "image/png" });
  assert.equal(calls[1].url, ticket.uploadUrl);
  assert.equal(calls[1].init!.method, "PUT");
  assert.equal(calls[1].init!.body, image);
  assert.equal(calls[1].init!.credentials, "omit");
  assert.equal(calls[1].init!.redirect, "error");
  assert.equal(new Headers(calls[1].init!.headers).get("x-ms-blob-type"), "BlockBlob");
  assert.equal(calls[2].url, "/api/uploads/complete");
  assert.deepEqual(JSON.parse(calls[2].init!.body as string), { uploadId: id });
});

test("a transient completion failure retains an ID for retry without re-uploading", async () => {
  let attempts = 0;
  const fetcher: typeof fetch = async (input) => {
    assert.equal(input, "/api/uploads/complete");
    if (++attempts === 1) return Response.json({ error: "Storage temporarily unavailable" }, { status: 502 });
    return Response.json({ url: `/media/${id}.webp` });
  };
  await assert.rejects(() => completeImageUpload(id, fetcher), (error: unknown) => error instanceof UploadCompletionError && error.uploadId === id);
  assert.equal(await completeImageUpload(id, fetcher), `/media/${id}.webp`);
  assert.equal(attempts, 2);
});

test("invalid images are rejected before requesting a SAS", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(() => uploadImage(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }), () => {}, fetcher));
  await assert.rejects(() => uploadImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), () => {}, fetcher));
  assert.equal(called, false);
});

test("CORS errors are explained and expired intents do not suggest endless processing retries", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    if (++calls === 1) return Response.json(ticket);
    throw new TypeError("network blocked");
  };
  await assert.rejects(() => uploadImage(file(), () => {}, fetcher), /CORS/);
  const expired: typeof fetch = async () => Response.json({ error: "上传凭据已过期，请重新上传图片" }, { status: 410 });
  await assert.rejects(() => completeImageUpload(id, expired), (error: unknown) => error instanceof Error && !(error instanceof UploadCompletionError));
});

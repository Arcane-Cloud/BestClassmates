import "./env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { cloudStorage, safeCloudError } from "./cloud-common";
import { createBlobSasUrl, getBlobNames } from "../lib/blob-sas";
import { processImage } from "../lib/process-image";

async function main() {
  const { config, service, container } = cloudStorage();
  const exists = await container.exists({ abortSignal: AbortSignal.timeout(20000) });
  if (!exists) await container.create({ abortSignal: AbortSignal.timeout(20000) });
  const properties = await container.getProperties();
  if (properties.blobPublicAccess) throw new Error("Existing container is public; refusing to change its access policy automatically");
  console.log(JSON.stringify({ container: config.containerName, created: !exists, access: "private" }));

  const origins = [new URL(process.env.APP_URL || "http://localhost:3000").origin, "http://localhost:3103"];
  const current = (await service.getProperties()).cors ?? [];
  const covered = origins.every((origin) => current.some((rule) => rule.allowedOrigins.split(",").includes(origin) && rule.allowedMethods.split(",").includes("PUT") && rule.allowedHeaders.split(",").includes("x-ms-blob-type")));
  if (!covered) {
    if (current.length >= 5) throw new Error("Azure already has five CORS rules; refusing to replace rules belonging to other applications");
    await service.setProperties({ cors: [...current, { allowedOrigins: [...new Set(origins)].join(","), allowedMethods: "PUT,OPTIONS", allowedHeaders: "content-type,x-ms-blob-type", exposedHeaders: "etag,x-ms-request-id", maxAgeInSeconds: 3600 }] });
  }
  console.log(JSON.stringify({ cors: covered ? "already-configured" : "added-without-replacing-existing-rules", origins }));

  const id = randomUUID();
  const names = getBlobNames(id);
  const original = container.getBlockBlobClient(names.original);
  const final = container.getBlockBlobClient(names.final);
  try {
    const bytes = await sharp({ create: { width: 240, height: 320, channels: 3, background: "#66877a" } }).png().toBuffer();
    const upload = createBlobSasUrl(config, id, "upload");
    const preflight = await fetch(upload.url, { method: "OPTIONS", headers: { Origin: origins[1], "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type,x-ms-blob-type" } });
    assert.ok(preflight.ok, `CORS preflight returned ${preflight.status}`);
    assert.equal(preflight.headers.get("access-control-allow-origin"), origins[1]);
    const put = await fetch(upload.url, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "image/png" }, body: new Uint8Array(bytes) });
    assert.equal(put.status, 201, `Direct SAS upload returned ${put.status}`);
    const overwrite = await fetch(upload.url, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "image/png" }, body: new Uint8Array(bytes) });
    assert.ok(!overwrite.ok, "Create-only SAS must not overwrite an existing original");
    const blobProperties = await original.getProperties();
    assert.equal(blobProperties.contentLength, bytes.length);
    const downloaded = await original.downloadToBuffer(0, bytes.length, { conditions: { ifMatch: blobProperties.etag } });
    const webp = await processImage(downloaded);
    await final.uploadData(webp, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "image/webp", blobCacheControl: "public, max-age=31536000, immutable" } });
    const anonymous = await fetch(final.url);
    assert.ok(!anonymous.ok, "Private container must reject anonymous reads");
    const signed = await fetch(createBlobSasUrl(config, id, "read").url);
    assert.equal(signed.status, 200);
    assert.equal(signed.headers.get("content-type"), "image/webp");
    assert.equal((await signed.arrayBuffer()).byteLength, webp.length);
    console.log(JSON.stringify({ azureLiveTest: "passed", cors: "passed", directUpload: "passed", overwriteRejected: overwrite.status, privateReadRejected: anonymous.status, signedRead: "passed", webpBytes: webp.length }));
  } finally {
    await Promise.all([original.deleteIfExists(), final.deleteIfExists()]);
    console.log("Temporary integration-test blobs removed; no existing media was deleted.");
  }
}
main().catch((error) => { console.error(JSON.stringify(safeCloudError(error))); process.exitCode = 1; });

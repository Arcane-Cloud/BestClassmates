import assert from "node:assert/strict";
import { test } from "node:test";
import { getConfiguredBlobOrigin, parseBlobConnectionString, readBlobConfiguration } from "../lib/blob-config";
import { createBlobSasUrl, getBlobNames, READ_SAS_SECONDS, UPLOAD_SAS_SECONDS } from "../lib/blob-sas";
import { mediaRedirect } from "../lib/media-response";

const key = Buffer.alloc(64, 251).toString("base64");
const connectionString = `DefaultEndpointsProtocol=https;AccountName=exampleaccount;AccountKey=${key};EndpointSuffix=core.windows.net`;
const environment = { AZURE_STORAGE_CONNECTION_STRING: connectionString, AZURE_STORAGE_CONTAINER: "classmates-media" };
const id = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-06T12:00:00Z");

test("connection string parsing preserves base64 plus signs and padding", () => {
  const parsed = parseBlobConnectionString(connectionString);
  assert.equal(parsed.accountKey, key);
  assert.equal(parsed.accountName, "exampleaccount");
  assert.equal(parsed.endpoint, "https://exampleaccount.blob.core.windows.net");
  assert.equal(getConfiguredBlobOrigin({}), null);
  assert.equal(getConfiguredBlobOrigin(environment), parsed.endpoint);
  assert.equal(parseBlobConnectionString(connectionString.replace("core.windows.net", "core.chinacloudapi.cn")).endpoint, "https://exampleaccount.blob.core.chinacloudapi.cn");
});
test("insecure endpoints, duplicate keys and incomplete connection strings are rejected", () => {
  assert.throws(() => readBlobConfiguration({}));
  assert.throws(() => parseBlobConnectionString(connectionString.replace("https", "http")));
  assert.throws(() => parseBlobConnectionString(`${connectionString};AccountName=other`));
  assert.throws(() => parseBlobConnectionString("UseDevelopmentStorage=true"));
  assert.throws(() => readBlobConfiguration({ ...environment, AZURE_STORAGE_CONTAINER: "bad--container" }));
  for (const endpoint of ["http://example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com/?key=secret", "https://example.com/#fragment"]) assert.throws(() => parseBlobConnectionString(`${connectionString};BlobEndpoint=${endpoint}`));
});
test("upload SAS is HTTPS, short-lived and create-only for one incoming blob", () => {
  const config = readBlobConfiguration(environment);
  const result = createBlobSasUrl(config, id, "upload", now);
  const url = new URL(result.url);
  assert.equal(url.pathname, `/classmates-media/incoming/${id}`);
  assert.equal(url.searchParams.get("sp"), "c");
  assert.equal(url.searchParams.get("sr"), "b");
  assert.equal(url.searchParams.get("spr"), "https");
  assert.equal(new Date(url.searchParams.get("se")!).valueOf() - now.valueOf(), UPLOAD_SAS_SECONDS * 1000);
  assert.equal(result.url.includes(config.accountKey), false);
  assert.ok(url.searchParams.get("sig"));
});
test("read SAS cannot write and targets only the final image", () => {
  const url = new URL(createBlobSasUrl(readBlobConfiguration(environment), id, "read", now).url);
  assert.equal(url.pathname, `/classmates-media/images/${id}.webp`);
  assert.equal(url.searchParams.get("sp"), "r");
  assert.equal(new Date(url.searchParams.get("se")!).valueOf() - now.valueOf(), READ_SAS_SECONDS * 1000);
  assert.equal(getBlobNames(id).url, `/media/${id}.webp`);
  assert.throws(() => getBlobNames("../private"));
});
test("short-lived SAS redirects cannot be cached", () => {
  const response = mediaRedirect(createBlobSasUrl(readBlobConfiguration(environment), id, "read", now).url);
  assert.equal(response.status, 307);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
});

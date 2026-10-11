import { BlobSASPermissions, generateBlobSASQueryParameters, SASProtocol, StorageSharedKeyCredential } from "@azure/storage-blob";
import type { BlobConfiguration } from "./blob-config";

export const UPLOAD_SAS_SECONDS = 5 * 60;
export const UPLOAD_INTENT_SECONDS = 15 * 60;
export const READ_SAS_SECONDS = 10 * 60;

export function getBlobNames(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw new Error("Invalid upload ID");
  return { original: `incoming/${id}`, final: `images/${id}.webp`, url: `/media/${id}.webp` };
}

export function createBlobSasUrl(configuration: BlobConfiguration, id: string, operation: "upload" | "read", now = new Date()) {
  const names = getBlobNames(id);
  const blobName = operation === "upload" ? names.original : names.final;
  const expiresOn = new Date(now.valueOf() + (operation === "upload" ? UPLOAD_SAS_SECONDS : READ_SAS_SECONDS) * 1000);
  const credential = new StorageSharedKeyCredential(configuration.accountName, configuration.accountKey);
  const sas = generateBlobSASQueryParameters({
    containerName: configuration.containerName,
    blobName,
    permissions: BlobSASPermissions.parse(operation === "upload" ? "c" : "r"),
    protocol: SASProtocol.Https,
    startsOn: new Date(now.valueOf() - 60 * 1000),
    expiresOn,
  }, credential).toString();
  return { url: `${configuration.endpoint}/${configuration.containerName}/${blobName}?${sas}`, expiresAt: expiresOn.toISOString() };
}

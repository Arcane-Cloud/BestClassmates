import "server-only";
import { BlobServiceClient } from "@azure/storage-blob";
import { readBlobConfiguration, type BlobConfiguration } from "./blob-config";
import { createBlobSasUrl, getBlobNames } from "./blob-sas";
import { HttpError } from "./errors";
import type { UploadStorage } from "./upload-service";

let cached: { client: BlobServiceClient; configuration: BlobConfiguration } | undefined;
function getAzure() {
  if (!cached) {
    let configuration: BlobConfiguration;
    try { configuration = readBlobConfiguration(process.env); }
    catch (error) { throw new HttpError(503, error instanceof Error ? error.message : "Azure Blob 未配置"); }
    cached = { configuration, client: BlobServiceClient.fromConnectionString(configuration.connectionString, {
      retryOptions: { maxTries: 2, retryDelayInMs: 300, maxRetryDelayInMs: 1000 },
    }) };
  }
  return cached;
}
function statusOf(error: unknown) {
  return error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
}
function storageFailure(error: unknown): never {
  if (error instanceof HttpError) throw error;
  // SDK errors may contain signed URLs or request headers; never forward or log those objects.
  throw new HttpError(502, "Azure Blob 暂时不可用，请检查账户密钥、容器权限或网络后重试");
}

export function getBlobStorage(): UploadStorage {
  const { client, configuration } = getAzure();
  const container = client.getContainerClient(configuration.containerName);
  const original = (id: string) => container.getBlockBlobClient(getBlobNames(id).original);
  const final = (id: string) => container.getBlockBlobClient(getBlobNames(id).final);
  return {
    authorize: (id, now) => createBlobSasUrl(configuration, id, "upload", now),
    async finalExists(id) {
      try { return await final(id).exists({ abortSignal: AbortSignal.timeout(10000) }); }
      catch (error) { return storageFailure(error); }
    },
    async originalProperties(id) {
      try {
        const properties = await original(id).getProperties({ abortSignal: AbortSignal.timeout(10000) });
        if (!properties.etag) throw new HttpError(502, "无法确认上传图片的版本，请重试");
        return { size: properties.contentLength ?? 0, contentType: properties.contentType ?? "", etag: properties.etag };
      } catch (error) {
        if (statusOf(error) === 404) throw new HttpError(409, "尚未检测到上传文件，请先完成上传");
        return storageFailure(error);
      }
    },
    async downloadOriginal(id, size, etag) {
      try {
        return await original(id).downloadToBuffer(0, size, {
          conditions: { ifMatch: etag }, abortSignal: AbortSignal.timeout(15000), concurrency: 1,
        });
      } catch (error) { return storageFailure(error); }
    },
    async writeFinal(id, bytes) {
      try {
        await final(id).uploadData(bytes, {
          conditions: { ifNoneMatch: "*" },
          blobHTTPHeaders: { blobContentType: "image/webp", blobContentDisposition: "inline", blobCacheControl: "public, max-age=31536000, immutable" },
          metadata: { uploadid: id }, concurrency: 1, abortSignal: AbortSignal.timeout(15000),
        });
      } catch (error) {
        // The final name is unique per intent. Another completing invocation may have won.
        if (statusOf(error) === 409 || statusOf(error) === 412) {
          try { if (await final(id).exists({ abortSignal: AbortSignal.timeout(10000) })) return; }
          catch (readError) { return storageFailure(readError); }
        }
        return storageFailure(error);
      }
    },
  };
}

export async function getMediaReadUrl(id: string) {
  const { client, configuration } = getAzure();
  const blob = client.getContainerClient(configuration.containerName).getBlockBlobClient(getBlobNames(id).final);
  try {
    if (!await blob.exists({ abortSignal: AbortSignal.timeout(10000) })) throw new HttpError(404, "图片不存在");
    return createBlobSasUrl(configuration, id, "read").url;
  } catch (error) { return storageFailure(error); }
}

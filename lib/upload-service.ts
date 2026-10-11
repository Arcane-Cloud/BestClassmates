import { randomUUID } from "node:crypto";
import { HttpError } from "./errors";
import { detectImageType, MAX_IMAGE_BYTES } from "./image-validation";
import { getBlobNames, UPLOAD_INTENT_SECONDS } from "./blob-sas";
import { uploadRequestSchema, type UploadTicket } from "./upload-contract";

export type UploadRecord = {
  id: string; adminId: string; expectedBytes: number; mimeType: string; expiresAt: Date; completedAt: Date | null;
};
export type UploadRepository = {
  create(record: UploadRecord): Promise<void>;
  find(id: string): Promise<UploadRecord | null>;
  complete(id: string, when: Date): Promise<void>;
};
export type UploadStorage = {
  authorize(id: string, now: Date): { url: string; expiresAt: string };
  finalExists(id: string): Promise<boolean>;
  originalProperties(id: string): Promise<{ size: number; contentType: string; etag: string }>;
  downloadOriginal(id: string, size: number, etag: string): Promise<Buffer>;
  writeFinal(id: string, bytes: Buffer): Promise<void>;
};

export async function issueUpload(adminId: string, input: unknown, repository: UploadRepository, storage: UploadStorage, now = new Date()): Promise<UploadTicket> {
  const metadata = uploadRequestSchema.parse(input);
  const id = randomUUID();
  const authorization = storage.authorize(id, now);
  await repository.create({ id, adminId, expectedBytes: metadata.size, mimeType: metadata.type,
    expiresAt: new Date(now.valueOf() + UPLOAD_INTENT_SECONDS * 1000), completedAt: null });
  return { uploadId: id, uploadUrl: authorization.url, expiresAt: authorization.expiresAt };
}

export async function completeUpload(adminId: string, id: string, repository: UploadRepository, storage: UploadStorage,
  encode: (input: Buffer) => Promise<Buffer>, now = new Date()): Promise<{ url: string }> {
  const record = await repository.find(id);
  if (!record || record.adminId !== adminId) throw new HttpError(404, "上传凭据不存在，请重新选择图片");
  const result = { url: getBlobNames(record.id).url };
  if (record.completedAt) return result;
  // Recover a previous invocation that wrote the blob but stopped before committing its status.
  if (await storage.finalExists(record.id)) { await repository.complete(record.id, now); return result; }
  if (record.expiresAt <= now) throw new HttpError(410, "上传凭据已过期，请重新上传图片");
  const properties = await storage.originalProperties(record.id);
  if (properties.size !== record.expectedBytes || properties.size < 1 || properties.size > MAX_IMAGE_BYTES) {
    throw new HttpError(422, "实际图片大小与上传声明不一致或超过 5 MB，请重新上传");
  }
  if (properties.contentType !== record.mimeType) throw new HttpError(422, "图片类型与上传声明不一致");
  const original = await storage.downloadOriginal(record.id, properties.size, properties.etag);
  if (original.length !== record.expectedBytes) throw new HttpError(422, "图片传输不完整，请重新上传");
  const detected = detectImageType(original);
  if (!detected || `image/${detected}` !== record.mimeType) throw new HttpError(415, "文件内容不是声明的 JPG、PNG 或 WebP 图片");
  let output: Buffer;
  try { output = await encode(original); }
  catch { throw new HttpError(422, "图片损坏或像素尺寸过大，请换一张图片"); }
  if (!output.length || output.length > MAX_IMAGE_BYTES) throw new HttpError(422, "处理后的图片仍超过 5 MB，请降低分辨率后重试");
  await storage.writeFinal(record.id, output);
  await repository.complete(record.id, now);
  // Keep the immutable original until lifecycle cleanup; its create-only SAS may still be valid.
  return result;
}

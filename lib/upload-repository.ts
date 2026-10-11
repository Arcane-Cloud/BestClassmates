import "server-only";
import { getDb } from "./db";
import type { UploadRepository } from "./upload-service";

export function getUploadRepository(): UploadRepository {
  const db = getDb();
  return {
    async create(record) { await db.mediaUpload.create({ data: record }); },
    find: (id) => db.mediaUpload.findUnique({ where: { id } }),
    async complete(id, when) { await db.mediaUpload.update({ where: { id }, data: { completedAt: when } }); },
  };
}

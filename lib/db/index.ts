import { PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };
export const isDemoMode = () => !process.env.DATABASE_URL;

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("请先配置 DATABASE_URL");
  if (!globalForDb.prisma) {
    const url = new URL(process.env.DATABASE_URL);
    // Pooling must also happen upstream: a singleton only spans one warm function instance.
    for (const [key, value] of [["connection_limit", "1"], ["pool_timeout", "10"], ["connect_timeout", "10"]]) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    globalForDb.prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  }
  return globalForDb.prisma;
}

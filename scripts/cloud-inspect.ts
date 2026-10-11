import "./env";
import { getDb } from "../lib/db";
import { cloudStorage, safeCloudError } from "./cloud-common";

async function inspectDatabase() {
  const db = getDb();
  try {
    const info = await db.$queryRaw<{ version: string; database_name: string }[]>`SELECT VERSION() AS version, DATABASE() AS database_name`;
    const tls = await db.$queryRaw<{ Variable_name: string; Value: string }[]>`SHOW SESSION STATUS LIKE 'Ssl_cipher'`;
    const tables = await db.$queryRaw<{ name: string }[]>`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME`;
    console.log(JSON.stringify({ mysql: { info, tlsCipher: tls[0]?.Value, tables: tables.map((row) => row.name) } }));
    if (!tls[0]?.Value) throw new Error("MySQL connection is not protected by TLS");
  } finally { await db.$disconnect(); }
}
async function inspectBlob() {
  const { service, container, config } = cloudStorage();
  const properties = await service.getProperties({ abortSignal: AbortSignal.timeout(20000) });
  const exists = await container.exists({ abortSignal: AbortSignal.timeout(20000) });
  const privacy = exists ? (await container.getProperties({ abortSignal: AbortSignal.timeout(20000) })).blobPublicAccess || "private" : "not-created";
  console.log(JSON.stringify({ blob: { container: config.containerName, exists, privacy, cors: properties.cors?.map((rule) => ({ origins: rule.allowedOrigins, methods: rule.allowedMethods, headers: rule.allowedHeaders })) ?? [] } }));
}
Promise.allSettled([inspectDatabase(), inspectBlob()]).then((results) => {
  for (const result of results) if (result.status === "rejected") { console.error(JSON.stringify(safeCloudError(result.reason))); process.exitCode = 1; }
});

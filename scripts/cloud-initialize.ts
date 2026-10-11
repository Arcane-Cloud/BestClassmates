import "./env";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getDb } from "../lib/db";
import { demoPeople } from "../lib/demo-data";
import { personSchema } from "../lib/validation";
import { hashPassword } from "../lib/password";
import { MAX_IMAGE_BYTES } from "../lib/image-validation";
import { processImage } from "../lib/process-image";
import { getBlobNames } from "../lib/blob-sas";
import { cloudStorage, safeCloudError } from "./cloud-common";

async function downloadSample(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error(`Sample image download failed: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error("Sample image exceeds upload limit"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return processImage(Buffer.concat(chunks));
}

async function main() {
  const db = getDb();
  try {
    const tls = await db.$queryRaw<{ Value: string }[]>`SHOW SESSION STATUS LIKE 'Ssl_cipher'`;
    if (!tls[0]?.Value) throw new Error("Refusing to initialize MySQL without TLS");
    const tables = await db.$queryRaw<{ name: string }[]>`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE()`;
    const tableNames = tables.map((row) => row.name);
    if (tableNames.length && !tableNames.includes("_prisma_migrations")) throw new Error("Database is not empty and has no Prisma migration history; review its schema before applying migrations");
    if (tableNames.includes("_prisma_migrations")) {
      const known = await db.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      if (!known.some((row) => row.migration_name === "20261006010000_mysql_initial")) throw new Error("Database has a different migration history; refusing to reset or baseline it automatically");
    }
    const require = createRequire(path.resolve("package.json"));
    const migration = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], { encoding: "utf8", env: process.env });
    if (migration.status !== 0) throw new Error(`Prisma deployment failed: ${migration.stderr || migration.stdout}`);
    console.log("MySQL migration applied successfully with TLS; no database reset was performed.");

    if (await db.admin.count() === 0) {
      const email = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD || randomBytes(24).toString("base64url");
      if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
      if (!process.env.ADMIN_PASSWORD) {
        const envPath = path.resolve(".env.local");
        const current = await readFile(envPath, "utf8");
        const updated = /^ADMIN_PASSWORD=.*$/m.test(current) ? current.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`) : `${current}\nADMIN_PASSWORD=${password}\n`;
        await writeFile(envPath, updated, { mode: 0o600 });
        process.env.ADMIN_PASSWORD = password;
      }
      await db.admin.create({ data: { email, passwordHash: await hashPassword(password) } });
      console.log("Initial administrator created. Credentials are stored only in the ignored .env.local file.");
    } else console.log("Existing administrators preserved; passwords were not changed.");

    if (await db.person.count() > 0) { console.log("Existing people preserved; sample seeding skipped."); return; }
    const { container } = cloudStorage();
    if (!await container.exists()) throw new Error("Private Blob container is missing; run cloud:blob first");
    const created: { blob: string; url: string }[] = [];
    try {
      const rows = [];
      for (const sample of demoPeople) {
        const names = getBlobNames(randomUUID());
        const bytes = await downloadSample(sample.portrait);
        await container.getBlockBlobClient(names.final).uploadData(bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "image/webp", blobCacheControl: "public, max-age=31536000, immutable" }, metadata: { purpose: "fictional-sample-portrait" } });
        created.push({ blob: names.final, url: names.url });
        rows.push({ ...personSchema.parse(sample), slug: sample.slug, portrait: names.url, avatar: names.url });
      }
      const result = await db.person.createMany({ data: rows, skipDuplicates: true });
      console.log(JSON.stringify({ fictionalPeopleInserted: result.count, portraitImagesStoredInBlob: created.length }));
    } finally {
      // Clean only uploads made by this invocation that are not referenced by any saved person.
      const referenced = await db.person.findMany({ where: { portrait: { in: created.map((item) => item.url) } }, select: { portrait: true } });
      const used = new Set(referenced.map((item) => item.portrait));
      for (const item of created) if (!used.has(item.url)) await container.getBlockBlobClient(item.blob).deleteIfExists();
    }
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(JSON.stringify(safeCloudError(error))); process.exitCode = 1; });

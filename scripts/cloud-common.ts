import "./env";
import { BlobServiceClient } from "@azure/storage-blob";
import { readBlobConfiguration } from "../lib/blob-config";

export function cloudStorage() {
  const config = readBlobConfiguration(process.env);
  const service = BlobServiceClient.fromConnectionString(config.connectionString, { retryOptions: { maxTries: 2 } });
  return { config, service, container: service.getContainerClient(config.containerName) };
}
export function safeCloudError(error: unknown) {
  let message = error instanceof Error ? error.message : "Unknown cloud error";
  const secrets = [process.env.DATABASE_URL, process.env.DIRECT_URL, process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.ADMIN_PASSWORD];
  try { secrets.push(decodeURIComponent(new URL(process.env.DATABASE_URL!).password)); } catch {}
  try { secrets.push(readBlobConfiguration(process.env).accountKey); } catch {}
  for (const secret of secrets) if (secret) message = message.replaceAll(secret, "[REDACTED]");
  message = message.replace(/([?&]sig=)[^&\s]+/g, "$1[REDACTED]");
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return { code, message };
}

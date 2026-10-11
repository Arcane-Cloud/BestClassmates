export type BlobConfiguration = {
  accountName: string;
  accountKey: string;
  containerName: string;
  endpoint: string;
  connectionString: string;
};

export function parseBlobConnectionString(connectionString: string) {
  const fields = new Map<string, string>();
  for (const segment of connectionString.trim().split(";")) {
    if (!segment.trim()) continue;
    const separator = segment.indexOf("=");
    if (separator < 1) throw new Error("Azure Connection String 格式不正确");
    const key = segment.slice(0, separator).trim();
    if (fields.has(key)) throw new Error("Azure Connection String 包含重复字段");
    fields.set(key, segment.slice(separator + 1).trim());
  }
  const accountName = fields.get("AccountName");
  const accountKey = fields.get("AccountKey");
  if (fields.get("DefaultEndpointsProtocol") !== "https") throw new Error("Azure Connection String 必须使用 HTTPS");
  if (!accountName || !/^[a-z0-9]{3,24}$/.test(accountName)) throw new Error("Azure Connection String 缺少合法 AccountName");
  if (!accountKey || !/^[A-Za-z0-9+/]+={0,2}$/.test(accountKey) || accountKey.length < 40) throw new Error("Azure Connection String 缺少合法 AccountKey");
  const suffix = fields.get("EndpointSuffix") || "core.windows.net";
  if (!/^[a-z0-9.-]+$/.test(suffix)) throw new Error("Azure EndpointSuffix 格式不正确");
  const rawEndpoint = fields.get("BlobEndpoint") || `https://${accountName}.blob.${suffix}`;
  let url: URL;
  try { url = new URL(rawEndpoint); } catch { throw new Error("Azure BlobEndpoint 格式不正确"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Azure BlobEndpoint 必须是不含路径和凭据的 HTTPS 服务源");
  }
  return { accountName, accountKey, endpoint: url.origin };
}

export function getConfiguredBlobOrigin(env: Record<string, string | undefined>) {
  return env.AZURE_STORAGE_CONNECTION_STRING ? parseBlobConnectionString(env.AZURE_STORAGE_CONNECTION_STRING).endpoint : null;
}
export function readBlobConfiguration(env: Record<string, string | undefined>): BlobConfiguration {
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = env.AZURE_STORAGE_CONTAINER;
  if (!connectionString || !containerName) throw new Error("请配置 AZURE_STORAGE_CONNECTION_STRING 和私有容器名称");
  if (!/^[a-z0-9](?!.*--)[a-z0-9-]{1,61}[a-z0-9]$/.test(containerName)) throw new Error("AZURE_STORAGE_CONTAINER 必须是 3–63 位合法容器名称");
  return { ...parseBlobConnectionString(connectionString), connectionString, containerName };
}

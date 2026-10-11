import { uploadRequestSchema, type UploadStage, type UploadTicket } from "./upload-contract";
import { isMediaFilename } from "./image-validation";

type Fetch = typeof fetch;
export class UploadCompletionError extends Error {
  constructor(public uploadId: string, message: string) { super(message); }
}
async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json(); }
  catch { throw new Error("服务未返回有效响应，请稍后重试"); }
}
export async function completeImageUpload(uploadId: string, fetcher: Fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetcher("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }), signal: AbortSignal.timeout(75000) });
  } catch { throw new UploadCompletionError(uploadId, "图片已上传，但处理响应超时。请重试云端处理，无需重复上传。"); }
  let data: Record<string, unknown>;
  try { data = await responseJson(response); }
  catch { throw new UploadCompletionError(uploadId, "图片已上传，但处理响应无效。请重试云端处理。"); }
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "云端图片处理失败";
    if (response.status >= 500 || response.status === 409 || response.status === 429) throw new UploadCompletionError(uploadId, message);
    throw new Error(message);
  }
  if (typeof data.url !== "string" || !data.url.startsWith("/media/") || !isMediaFilename(data.url.slice(7))) {
    throw new UploadCompletionError(uploadId, "云端未返回有效图片地址，请重试处理");
  }
  return data.url;
}

export async function uploadImage(file: File, onStage: (stage: UploadStage) => void, fetcher: Fetch = fetch): Promise<string> {
  const parsed = uploadRequestSchema.safeParse({ size: file.size, type: file.type });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "图片格式不正确");
  onStage("authorizing");
  let response: Response;
  try {
    response = await fetcher("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(30000) });
  } catch { throw new Error("无法获取上传凭据，请检查网络后重试"); }
  const data = await responseJson(response);
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "无法获取上传凭据");
  if (typeof data.uploadId !== "string" || typeof data.uploadUrl !== "string" || !data.uploadUrl.startsWith("https://")) {
    throw new Error("上传凭据无效，请重试");
  }
  const ticket = data as unknown as UploadTicket;
  onStage("uploading");
  let uploaded: Response;
  try {
    uploaded = await fetcher(ticket.uploadUrl, {
      method: "PUT", body: file, headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
      credentials: "omit", redirect: "error", mode: "cors", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(120000),
    });
  } catch { throw new Error("无法直传 Azure Blob。请检查网络，以及容器服务的 CORS 是否允许当前网站来源和 PUT 请求。"); }
  if (!uploaded.ok) throw new Error("Azure 拒绝了图片上传，请检查上传凭据有效期和存储配置后重新选择图片。");
  onStage("processing");
  return completeImageUpload(ticket.uploadId, fetcher);
}

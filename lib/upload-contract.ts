import { z } from "zod";
import { MAX_IMAGE_BYTES } from "./image-validation";

export const uploadRequestSchema = z.object({
  size: z.number().int().min(1, "图片不能为空").max(MAX_IMAGE_BYTES, "图片不能超过 5 MB"),
  type: z.enum(["image/jpeg", "image/png", "image/webp"], { error: "仅支持 JPG、PNG、WebP 图片" }),
}).strict();

export const uploadCompletionSchema = z.object({ uploadId: z.uuid() }).strict();
export type UploadTicket = { uploadId: string; uploadUrl: string; expiresAt: string };
export type UploadStage = "authorizing" | "uploading" | "processing";

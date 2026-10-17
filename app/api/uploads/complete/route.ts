import { NextResponse } from "next/server";
import { processImage } from "@/lib/process-image";
import { requireAdmin } from "@/lib/auth";
import { apiError, readJson } from "@/lib/http";
import { getBlobStorage } from "@/lib/azure-blob";
import { getUploadRepository } from "@/lib/upload-repository";
import { uploadCompletionSchema } from "@/lib/upload-contract";
import { completeUpload } from "@/lib/upload-service";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { uploadId } = uploadCompletionSchema.parse(await readJson(request, 4096));
    const result = await completeUpload(admin.id, uploadId, getUploadRepository(), getBlobStorage(), processImage);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

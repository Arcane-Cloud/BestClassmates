import { NextResponse } from "next/server";
import { checkUploadRateLimit, requireAdmin } from "@/lib/auth";
import { apiError, readJson } from "@/lib/http";
import { getDb } from "@/lib/db";
import { getBlobStorage } from "@/lib/azure-blob";
import { getUploadRepository } from "@/lib/upload-repository";
import { issueUpload } from "@/lib/upload-service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = await readJson(request, 4096);
    const storage = getBlobStorage();
    await checkUploadRateLimit(admin.id);
    await getDb().mediaUpload.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
    const ticket = await issueUpload(admin.id, input, getUploadRepository(), storage);
    return NextResponse.json(ticket, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

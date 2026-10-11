import { isMediaFilename } from "@/lib/image-validation";
import { getMediaReadUrl } from "@/lib/azure-blob";
import { apiError } from "@/lib/http";
import { mediaRedirect } from "@/lib/media-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!isMediaFilename(filename)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const id = filename.slice(0, -".webp".length);
    return mediaRedirect(await getMediaReadUrl(id));
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

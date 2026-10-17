import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "./errors";
export { HttpError } from "./errors";
export async function readLimitedBody(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"));
  if (length > limit) throw new HttpError(413, "提交内容过大");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "请求内容为空");
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new HttpError(413, "提交内容过大"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts);
}
export async function readJson(request: Request, limit = 256 * 1024) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "请使用 JSON 格式");
  const body = await readLimitedBody(request, limit);
  try { return JSON.parse(body.toString("utf8")); } catch { throw new HttpError(400, "JSON 格式无效"); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "内容校验失败", issues: error.flatten() }, { status: 422 });
  let cause = error;
  for (let i = 0; i < 4 && cause && typeof cause === "object"; i++) {
    if ("code" in cause && cause.code === "P2002") return NextResponse.json({ error: "这个人物链接已被使用，请更换链接标识" }, { status: 409 });
    if ("code" in cause && cause.code === "P2025") return NextResponse.json({ error: "资料不存在或已被删除" }, { status: 404 });
    cause = "cause" in cause ? cause.cause : null;
  }
  console.error("Request failed:", error);
  return NextResponse.json({ error: "服务暂时不可用，请检查数据库连接或稍后重试" }, { status: 503 });
}

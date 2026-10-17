import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isDemoMode } from "@/lib/db";
import { checkLoginRateLimit, createSession, destroySession } from "@/lib/auth";
import { dummyPasswordHash, verifyPassword } from "@/lib/password";
import { apiError, HttpError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (isDemoMode()) throw new HttpError(503, "演示模式不支持登录，请先配置数据库并创建管理员");
    const { email, password } = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).parse(await readJson(request));
    const normalizedEmail = email.toLowerCase();
    await checkLoginRateLimit(normalizedEmail);
    const admin = await getDb().admin.findUnique({ where: { email: normalizedEmail } });
    const valid = await verifyPassword(password, admin?.passwordHash ?? dummyPasswordHash);
    if (!admin || !valid) throw new HttpError(401, "邮箱或密码不正确");
    await createSession(admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(_request: Request) {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

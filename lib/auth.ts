import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, isDemoMode } from "./db";
import { hashToken, makeToken } from "./password";
import { HttpError } from "./http";
import { incrementRateLimit } from "./rate-limit";

const COOKIE = "classmates_session";
const SESSION_SECONDS = 60 * 60 * 8;

export async function getSession() {
  if (isDemoMode()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await getDb().session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    select: { admin: { select: { id: true, email: true } } },
  });
  return session?.admin ?? null;
}
export async function requireAdmin() {
  if (isDemoMode()) throw new HttpError(503, "当前为只读演示模式，请先配置数据库和管理员账号");
  const session = await getSession();
  if (!session) throw new HttpError(401, "登录已过期，请重新登录");
  return session;
}
export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
export async function createSession(adminId: string) {
  const db = getDb();
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const token = makeToken();
  await db.session.create({ data: { tokenHash: hashToken(token), adminId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token && !isDemoMode()) await getDb().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(COOKIE);
}

async function consumeRateLimit(identity: string, max: number, message: string) {
  const attempts = await incrementRateLimit(getDb(), hashToken(identity));
  if (attempts > max) throw new HttpError(429, message);
}
export async function checkLoginRateLimit(email: string) {
  await getDb().loginAttempt.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } });
  const message = "尝试次数过多，请在 15 分钟后重试";
  await consumeRateLimit("global", 100, message);
  await consumeRateLimit(`email:${email}`, 8, message);
}
export async function checkUploadRateLimit(adminId: string) {
  await consumeRateLimit(`upload:${adminId}`, 40, "图片上传过于频繁，请在 15 分钟后重试");
}

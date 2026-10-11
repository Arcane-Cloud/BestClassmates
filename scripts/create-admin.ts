import "./env";
import { z } from "zod";
import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";

async function main() {
  const email = z.email().max(254).parse(process.env.ADMIN_EMAIL?.trim().toLowerCase());
  const password = z.string().min(12, "管理员密码至少 12 个字符").max(256).parse(process.env.ADMIN_PASSWORD);
  const db = getDb();
  try {
    const existing = await db.admin.findUnique({ where: { email }, select: { id: true } });
    if (existing) { console.log("管理员已存在，未更改密码。"); return; }
    await db.admin.create({ data: { email, passwordHash: await hashPassword(password) } });
    console.log(`管理员 ${email} 已创建。请从运行环境移除 ADMIN_PASSWORD。`);
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

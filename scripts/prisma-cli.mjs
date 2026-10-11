import { config } from "dotenv";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

config({ path: ".env.local", quiet: true });
config({ quiet: true });
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const env = { ...process.env };

// Client generation and schema validation never connect to a database.
if (["generate", "validate"].includes(args[0])) {
  env.DATABASE_URL ||= "mysql://generate:generate@localhost:3306/generate_only";
  env.DIRECT_URL ||= env.DATABASE_URL;
} else if (!env.DATABASE_URL || !env.DIRECT_URL) {
  console.error("数据库命令需要 DATABASE_URL 和 DIRECT_URL。请配置 MySQL 连接，Azure 环境保持严格 TLS 校验。");
  process.exit(1);
}

const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
  stdio: "inherit", env,
});
if (result.error) console.error("无法启动 Prisma CLI:", result.error.message);
process.exit(result.status ?? 1);

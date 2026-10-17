// 本项目 Prisma 使用 library 引擎（prisma/schema.prisma: engineType = "library"），
// 运行时只加载 .prisma/client 下的原生查询引擎（libquery_engine-*.so.node / *.dll.node），
// require 链为 @prisma/client/default.js -> .prisma/client/index.js -> runtime/library.js。
//
// 实测（Prisma 6.19.0）：`prisma generate` 构建期只需要当前 datasource provider
// （见 prisma/schema.prisma，本项为 mysql）对应的
// runtime/query_engine_bg.<provider>.wasm-base64.{js,mjs}，
// 其余文件都不会被 generate 或运行时加载，却会被 Next.js 输出文件追踪和
// EdgeOne externalNodeModules 整包复制进 SSR 函数包（上限 128MiB）：
//   1. runtime/query_engine_bg.<其他数据库>.wasm-base64.{js,mjs}（每个约 2.8~3.0MiB）
//   2. runtime/query_compiler_bg.*.wasm-base64.{js,mjs}（每个约 2.4~2.5MiB）
//   3. runtime/*.map 源码映射（合计约 14MiB）
//   4. .prisma/client/query_engine_bg.wasm（edge/wasm 引擎入口才用，约 2.2MiB）
//   5. .prisma/client/*.tmp*（Windows 上 generate 被中断残留的引擎临时文件，每个约 20MiB）
//
// 本脚本在每次 generate 之后运行，幂等可重复；必须保留 provider 对应的
// query_engine_bg.<provider>.wasm-base64.{js,mjs}，否则下一次 generate 会失败。
// 注意：若将来切换 engineType = "client"（驱动适配器）或更换数据库 provider，
// 请同步 review 本脚本的保留清单。
import { readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const BASE64_FILE = /^(query_engine_bg|query_compiler_bg)\.\w+\.wasm-base64\.(js|mjs)$/;

function readProvider(schema) {
  const match = schema.match(/datasource\s+db\s*\{[^}]*?provider\s*=\s*"(\w+)"/s);
  return match?.[1] ?? null;
}

const schemaPath = path.join("prisma", "schema.prisma");
let provider;
try {
  provider = readProvider(await readFile(schemaPath, "utf8"));
} catch {
  provider = null;
}
if (!provider) {
  console.error(`[trim-prisma] 无法从 ${schemaPath} 解析 datasource provider，已跳过裁剪。`);
  process.exit(0);
}

const TARGETS = [
  {
    dir: path.join("node_modules", "@prisma", "client", "runtime"),
    stale: (name) =>
      name.endsWith(".map") ||
      (BASE64_FILE.test(name) && name !== `query_engine_bg.${provider}.wasm-base64.js` && name !== `query_engine_bg.${provider}.wasm-base64.mjs`),
  },
  {
    dir: path.join("node_modules", ".prisma", "client"),
    stale: (name) => name === "query_engine_bg.wasm" || /\.tmp\w*$/.test(name),
  },
];

const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

let removedCount = 0;
let removedBytes = 0;
const failures = [];

for (const { dir, stale } of TARGETS) {
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`[trim-prisma] 跳过（目录不存在，先运行 prisma generate）：${dir}`);
      continue;
    }
    throw error;
  }
  for (const name of names.filter(stale)) {
    const file = path.join(dir, name);
    try {
      const { size } = await stat(file);
      await rm(file, { force: true });
      removedCount += 1;
      removedBytes += size;
      console.log(`[trim-prisma] 删除 ${file}（${mib(size)}）`);
    } catch (error) {
      failures.push(`${file}: ${error.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[trim-prisma] 以下文件删除失败（若本地 dev server 正在运行请先关闭后重试）：");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`[trim-prisma] provider=${provider}，共删除 ${removedCount} 个文件，释放 ${mib(removedBytes)}。`);

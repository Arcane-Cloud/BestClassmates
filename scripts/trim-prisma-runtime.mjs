// 本项目 Prisma 使用 library 引擎（prisma/schema.prisma: engineType = "library"），
// 运行时只加载 .prisma/client 下的原生查询引擎（libquery_engine-*.so.node / *.dll.node），
// require 链为 @prisma/client/default.js -> .prisma/client/index.js -> runtime/library.js。
//
// 实测（Prisma 6.19.0 + EdgeOne 部署验证）：
//   - `prisma generate` 构建期只需要当前 datasource provider（本项为 mysql）对应的
//     runtime/query_engine_bg.<provider>.wasm-base64.{js,mjs}，其余 base64 不参与 generate；
//   - EdgeOne Node Functions 的运行时平台是 rhel-openssl-1.1.x（部署报错实测确认），
//     构建机的 native 引擎及其他平台引擎打包后永远用不到。
//
// 因此本脚本在每次 generate 之后删除：
//   1. runtime/query_engine_bg.<其他数据库>.wasm-base64.{js,mjs}（每个约 2.8~3.0MiB）
//   2. runtime/query_compiler_bg.*.wasm-base64.{js,mjs}（每个约 2.4~2.5MiB）
//   3. runtime/*.map 源码映射（合计约 14MiB）
//   4. .prisma/client/query_engine_bg.wasm（仅 @prisma/client/edge 入口使用，约 2.2MiB）
//   5. .prisma/client/*.tmp*（generate 被中断残留的引擎临时文件，每个约 20MiB）
//   6. .prisma/client 中不属于部署平台和本机开发平台的原生引擎
//      （每个约 17~21MiB；EdgeOne 构建机会删掉 native 与非部署平台引擎）
//
// 必须保留 provider 对应的 query_engine_bg.<provider>.wasm-base64.{js,mjs}，
// 否则下一次 generate 会失败。幂等可重复执行。
// 若更换数据库 provider、engineType 或部署平台，请同步 review 本脚本。
import { readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

// EdgeOne Node Functions 实测运行时平台（见 prisma/schema.prisma 的注释）。
const DEPLOY_ENGINE = "rhel-openssl-1.1.x";

const BASE64_FILE = /^(query_engine_bg|query_compiler_bg)\.\w+\.wasm-base64\.(js|mjs)$/;

function readProvider(schema) {
  const match = schema.match(/datasource\s+db\s*\{[^}]*?provider\s*=\s*"(\w+)"/s);
  return match?.[1] ?? null;
}

// 从引擎文件名解析平台标识：libquery_engine-<platform>.so.node、
// libquery_engine-<platform>.dylib.node、query_engine-<platform>.dll.node。
function enginePlatform(name) {
  for (const suffix of [".so.node", ".dylib.node"]) {
    if (name.startsWith("libquery_engine-") && name.endsWith(suffix)) {
      return name.slice("libquery_engine-".length, -suffix.length);
    }
  }
  if (name.startsWith("query_engine-") && name.endsWith(".dll.node")) {
    return name.slice("query_engine-".length, -".dll.node".length);
  }
  return null;
}

// 部署平台引擎始终保留；非 Linux 开发机还需要本机原生引擎（本地 dev/迁移/studio）。
// Linux 构建机（EdgeOne）上 native 是构建平台引擎，运行时用不到，删除。
function keepEngine(platform) {
  if (platform === DEPLOY_ENGINE) return true;
  if (process.platform === "win32" && platform === "windows") return true;
  if (process.platform === "darwin" && platform.startsWith("darwin")) return true;
  return false;
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
    stale: (name) => {
      if (name === "query_engine_bg.wasm") return true;
      if (/\.tmp\w*$/.test(name)) return true;
      const platform = enginePlatform(name);
      return platform !== null && !keepEngine(platform);
    },
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

console.log(`[trim-prisma] provider=${provider}，部署平台=${DEPLOY_ENGINE}，共删除 ${removedCount} 个文件，释放 ${mib(removedBytes)}。`);

import type { NextConfig } from "next";
import { getConfiguredBlobOrigin } from "./lib/blob-config";

const blobOrigin = getConfiguredBlobOrigin(process.env);
const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@azure/storage-blob", "sharp"],
  outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/**/*"] },
  // library 引擎运行时不会加载这些文件（见 scripts/trim-prisma-runtime.mjs 的说明），
  // 从追踪结果里排除，避免它们进入 standalone 输出和 EdgeOne SSR 函数包（上限 128MiB）。
  outputFileTracingExcludes: {
    "/**": [
      "./node_modules/@prisma/client/runtime/*.map",
      "./node_modules/@prisma/client/runtime/*.wasm-base64.*",
      "./node_modules/.prisma/client/query_engine_bg.wasm",
      "./node_modules/.prisma/client/*.tmp*",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self' https://*.blob.core.windows.net https://*.blob.core.chinacloudapi.cn${blobOrigin ? ` ${blobOrigin}` : ""}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
    ] }];
  },
};
export default config;

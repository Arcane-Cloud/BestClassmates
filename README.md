# 最佳同学 · Best Classmates

打开网站即为**人物全览**。点击人物后进入车手登场式展示：人物图片铺底，名称、外号与简介叠加在同一页，配合光扫、遮罩、轮廓字与轻量视差。

**技术栈：** Next.js 16.3.8 · React 19.3 · TypeScript · GSAP · Prisma 6.19 · **Azure MySQL + Azure Blob Storage**。

面向 Node.js Serverless，提供 EdgeOne Maker 项目配置 `edgeone.json`。不依赖本地媒体磁盘，不使用 Edge Runtime。

## 界面与内容

- `/`：直接显示人物网格和名称/外号/简介搜索，没有宣传型首页或关于我们区块。
- `/people/[slug]`：沉浸式人物图片背景，名称、外号、简介完整展示，无经历、图集、信息标签页。移动端长文案可自然滚动。
- `/admin`：人物管理、草稿/发布、排序、新增/编辑/删除。
- 编辑表单仅有三个文字资料字段：**名称、外号、简介**。人物主图、头像、氛围背景和主题色属于视觉设置。
- 人物公开链接由服务端自动生成，编辑资料不会改变链接。
- 支持触屏、键盘焦点和系统的减少动态效果偏好。

## 本地运行

推荐 Node.js 22 或 24，最低 20.19。安装时包含开发依赖：

```bash
npm install --include=dev
npm run dev
```

访问 <http://localhost:3000>，管理后台为 `/admin`。安装与生产构建会生成 Prisma Client，但**不会自动执行数据库迁移**。

未设置 `DATABASE_URL` 时为明确标注的只读演示模式；演示人物均为虚构。已配置数据库但连接失败时显示错误，不会悄悄回退为演示数据。

Windows 上如果 Prisma 报 `EPERM ... query_engine-windows.dll.node`，先停止本项目仍在运行的 Next.js 服务再生成客户端；不要结束其他项目的 Node 进程。

## 凭据配置

复制 `.env.example` 为 `.env.local`。真实密码和连接串只能放在这个被 Git 忽略的文件或部署平台 Secret 中，不能放到源码、测试、README 或 `NEXT_PUBLIC_` 变量。

```dotenv
DATABASE_URL="mysql://USER:ENCODED_PASSWORD@YOUR_SERVER.mysql.database.azure.com:3306/best_classmates?sslaccept=strict"
DIRECT_URL="mysql://USER:ENCODED_PASSWORD@YOUR_SERVER.mysql.database.azure.com:3306/best_classmates?sslaccept=strict"
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_BASE64_KEY;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER=classbbs
```

- 密码中的 `@` 必须编码为 `%40`，其他保留字符也应进行 URL 编码。
- Azure MySQL 保留 `sslaccept=strict`，不跳过证书验证。
- Azure Connection String 按第一个 `=` 分割字段，保留 AccountKey 中的 `+` 和结尾 `=`。
- 支持 `EndpointSuffix` 和 HTTPS `BlobEndpoint`，例如 Azure 中国区的 `core.chinacloudapi.cn`；不支持明文 HTTP 或开发存储模拟器连接串。
- `APP_URL` 必须与浏览器访问源完全一致。生产环境使用 HTTPS，否则安全会话 Cookie 无法正常工作。

## Azure 真实初始化与测试

### 1. 只读检查

```bash
npm run cloud:inspect
```

检查 MySQL TLS、版本、现有表，以及 Blob 容器/CORS。不会修改资源，不打印密码或账户密钥。

### 2. Blob 初始化与真实上传验证

```bash
npm run cloud:blob
```

这是可选的管理员/维护命令：在不存在时创建私有容器，追加必要 CORS（不替换已有规则），执行真实上传验证并删除本次测试产生的 Blob。EdgeOne 运行时不会自动修改 Azure 账户级 CORS，避免无意更改共享 Storage Account 上其他应用的规则。

部署前在 Azure Storage 的 Blob service CORS 中添加 EdgeOne 生产域名和需要使用的预览域名，允许 `PUT, OPTIONS`，允许请求头 `content-type,x-ms-blob-type`，暴露响应头 `etag,x-ms-request-id`。只允许实际需要的 HTTPS 来源，不要使用通配来源。Storage 防火墙也必须允许浏览器和函数访问。

### 3. MySQL 迁移与初始资料

```bash
npm run cloud:initialize
```

此命令先检查 TLS 和现有表：

- 空库：执行已审阅的 MySQL `prisma migrate deploy`。
- 已有当前项目的迁移历史：沿用迁移，不 reset。
- 有现有业务表但无匹配迁移历史：停止并要求核对，**不自动 baseline、drop 或覆盖数据**。

初始化后：

- 没有管理员时创建初始管理员；密码为空时使用安全随机值，仅保存到 `.env.local`，不会打印。已有管理员和密码不变。
- 人物表为空时才导入六位虚构示例人物，并把示例图片真实上传至 Blob。已有资料不覆盖、不重复播种。
- 未被成功保存资料引用的本次新图片会被清理，不删除原有媒体。

### 4. 完整应用联调

先启动 `npm run dev`，再在另一个终端运行：

```bash
npm run test:cloud
```

连接真实 MySQL、真实运行中的应用和 Blob，创建独立临时管理员，验证：登录、简单表单、浏览器 Azure 直传、草稿隔离、发布、修改、取消发布、删除、MySQL 计数器与登出。结束时仅清理本次创建的临时人物、管理员和图片，不改已有用户资料。

**云命令会修改真实资源。** 只在你有权管理且已备份的目标环境执行，不要把它们配置为每次函数启动、安装依赖或预览构建的自动步骤。

## MySQL 连接排障

若连接在收到 MySQL 握手前就关闭，先检查网络而非反复更换密码：

- DNS 返回 `198.18.x.x` 通常表明本机代理使用 Fake-IP。为实际的 `YOUR_SERVER.mysql.database.azure.com` 和 TCP 3306 配置直连或正确的代理规则。
- Azure 防火墙仅放行必要的实际出口 IP；不要开放全部互联网来源。
- 确认服务器处于运行状态且允许当前网络访问。
- 保留严格 TLS 校验，不以 `accept_invalid_certs` 掩盖证书或网络问题。

`cloud:inspect` 会在数据写入前报告连接问题。未连通时，迁移、管理员创建和真实应用联调均不能视为成功。

## Prisma 与迁移

`prisma/schema.prisma` 实际使用：

```prisma
generator client {
  provider      = "prisma-client-js"
  engineType    = "library"
  binaryTargets = ["native", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x"]
}

datasource db {
  provider  = "mysql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- `prisma` 和 `@prisma/client` 固定为同一版本。
- MySQL UUID 使用 `Char(36)`，时间使用 UTC `DateTime(3)`，不保留 PostgreSQL 专属类型。
- 登录和上传限流使用 MySQL 原子 UPSERT，在同一事务内读取计数，防止并发丢失更新。
- 默认每个暖函数实例使用一个连接，补充 `connection_limit=1`、`pool_timeout=10`、`connect_timeout=10`。单例不能跨函数实例共享连接，应控制 Serverless 最大并发与数据库连接额度。
- 当前迁移在 `prisma/migrations`；旧 PostgreSQL SQL 仅归档于 `prisma/postgresql-archive`，绝不能应用到 MySQL。
- 后续开发迁移：在独立开发数据库执行 `npm run db:migrate:dev -- --name change_name`，审阅 SQL 后部署时执行 `npm run db:migrate`。
- `db:baseline` 仅用于人工确认结构完全一致后的现有 MySQL 库，不能在新库或未核对的库上使用。
- RHEL targets 面向 Linux x86_64。ARM 部署需要另外补充相应目标。建议在部署平台的 Linux 构建环境生成产物，不上传 Windows `.next`。

本地可选 MySQL：设置 `.env.example` 中的 `MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD` 后，执行 `docker compose --env-file .env.local up -d`。连接 Azure 时无需启动本地数据库。

## Blob 流程与生命周期

```text
浏览器 ──元数据 JSON──> /api/uploads
       <──5 分钟、仅创建权限 SAS──
浏览器 ──图片 PUT──> 私有容器 incoming/<uuid>
浏览器 ──上传 ID──> /api/uploads/complete
服务端验证归属、有效期、实际大小、ETag 和格式
服务端在内存中重编码 ──不可覆盖写入──> images/<uuid>.webp
数据库保存稳定路径 /media/<uuid>.webp
```

图片不经过 Serverless 入站请求体，支持 JPG/PNG/WebP、最大 5 MB、最多 2500 万输入像素；输出最大 2400×2400。没有本地媒体文件依赖。

`/media/` 返回 10 分钟只读 SAS 重定向，重定向禁止缓存，最终 Blob 使用不可变缓存。原图不可公开读取，但**最终展示图片是公开内容**：知道稳定媒体路径即可获取只读链接，草稿不等于图片访问控制。

必须在 Azure Portal 为 `YOUR_CONTAINER/incoming/` 添加生命周期清理，例如删除修改时间超过 1 天的原图；不要对 `images/` 使用该规则。账户 Connection String 不能替代 Azure ARM 管理身份，因此脚本不会声称已自动安装生命周期策略。若有版本/快照，也要按组织策略处理其历史数据。

SAS 不能强制上传字节上限，应用会在授权和处理阶段检查实际大小。建议配置存储容量和费用告警。删除人物不会自动删除可能被其他资料引用的正式图片。

## 本地验证

```bash
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

单元测试使用模拟存储和虚构数据，不连接真实账户。Playwright 演示回归固定使用空 `DATABASE_URL` 和 3100 端口，验证根页面全览、图片铺底详情、搜索、手机布局、无旧入口、减少动效和后台写保护。

`test:cloud` 才是实际 MySQL/Blob 联调；模拟测试通过不代表云资源已迁移。

## EdgeOne Maker / Serverless 部署

项目根目录包含 EdgeOne `edgeone.json`，默认安装命令为 `npm ci --include=dev`、构建命令为 `npm run build`，使用平台支持的 Node.js `22.11.0`。保留 Next.js 框架自动识别和 SSR，不设置静态导出，也不填写猜测的输出目录。云函数最长执行时间配置为 120 秒；Prisma、Azure SDK 和 Sharp 保留为 Node 外部依赖，Prisma Client 引擎纳入函数文件。

在 EdgeOne Maker 导入 Git 仓库后，设置以下**服务端环境变量**。凭据应在预览/生产运行环境与构建环境按平台要求配置，绝不能使用 `NEXT_PUBLIC_` 前缀：

```dotenv
DATABASE_URL=mysql://USER:ENCODED_PASSWORD@SERVER.mysql.database.azure.com:3306/best_classmates?sslaccept=strict
DIRECT_URL=mysql://USER:ENCODED_PASSWORD@SERVER.mysql.database.azure.com:3306/best_classmates?sslaccept=strict
APP_URL=https://你的EdgeOne生产域名
ADMIN_EMAIL=3847796913@qq.com
ADMIN_PASSWORD=设置至少12位的高强度密码
AZURE_STORAGE_CONNECTION_STRING=你的Azure Storage Connection String
AZURE_STORAGE_CONTAINER=classbbs
```

安装阶段会生成 Prisma Client，构建阶段只执行 Prisma 生成与 `next build`；**不会连接数据库、执行迁移、创建管理员、播种人物、修改 Azure 容器/CORS**。这是为了保证 Serverless 构建可重复且不会因预览构建误写生产数据。

首次发布前必须在有数据库访问权限的环境运行一次 `npm run cloud:initialize`；它会在 TLS 确认后应用迁移、创建初始管理员并向空库写入演示人物。该引导目前是有意保留的独立管理步骤，不会由 Maker 的 build 自动执行。EdgeOne Maker 若只提供 install/build 而不提供初始化命令，可在本地/CI 运行一次，然后再发布；不要把此脚本设置为每次部署的构建钩子。生产首次登录后立即在 `.env.local` 或平台 Secret 管理中妥善保管/轮换管理员凭据。

部署前还需：

1. 在 Azure Blob Service CORS 中将 `APP_URL` 生产域名和所需预览域名加入允许源，允许 `PUT, OPTIONS`，允许 `content-type,x-ms-blob-type` 请求头，暴露 `etag,x-ms-request-id`。EdgeOne 运行时不会自动改动共享账户级 CORS。
2. 确保 Azure MySQL 和 Blob 网络策略允许 EdgeOne 函数出口访问。Prisma `binaryTargets` 已包含 `native`、`rhel-openssl-1.1.x`、`rhel-openssl-3.0.x`；原生依赖应在 Linux 构建环境生成并测试。
3. 配置 `incoming/` 原图生命周期清理、数据库与 Blob 备份；不能对 `images/` 设置同样清理规则。
4. 先用独立预览资源验证数据库登录、图片上传与处理，再切换生产域名和资源。

EdgeOne 官方配置说明：<https://pages.edgeone.ai/document/edgeone-json>。Maker 的 Next.js 支持说明未明确承诺 Next 16、Prisma 原生引擎与 Sharp 的全部组合，发布前需在目标 Maker 项目验证完整 SSR/API 路由；如果平台无法执行 Node.js 原生依赖，纯 Edge Runtime 不能运行本项目服务端。

视觉借鉴赛车人物展示的编辑语言，不使用 F1 官方标识，也不代表官方关联。

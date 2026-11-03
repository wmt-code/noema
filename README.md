# Noema

面向个人创作者的 AI 短剧创作平台，采用 Electron + React + TypeScript、NestJS、Pi Agent Core 和 PostgreSQL。

工程方案见 [工程实施计划](docs/engineering-plan.md)，开发进度见 [第一阶段开发步骤](docs/phase-1.md)。

## 开发环境

- Node.js 24 LTS，最低 24.14.1。
- pnpm 12.16.1，由根目录 `packageManager` 字段固定。
- Docker Compose，运行 PostgreSQL、Redis 本地开发环境。

在仓库根目录运行：

```sh
corepack pnpm install
corepack pnpm --version
```

如系统未安装 Corepack，可使用 `npx --yes pnpm@12.16.1 install`，并通过 `npx --yes pnpm@12.16.1 --filter @noema/server dev` 或 `npx --yes pnpm@12.16.1 --filter @noema/desktop dev` 启动应用；根目录的快捷命令依赖 Corepack。

Electron 45 在首次启动时下载桌面运行时，需要访问官方分发地址；无需单独下载 Playwright 浏览器。使用代理时，需按[桌面端说明](apps/desktop/README.md)设置 Electron 下载器的代理选项。

## 本地数据库与 Redis

将根目录 `.env.example` 复制为 `.env`（PowerShell：`Copy-Item .env.example .env`），然后运行：

```sh
corepack pnpm infra:up
corepack pnpm infra:check
corepack pnpm db:validate
corepack pnpm db:deploy
corepack pnpm db:check
corepack pnpm db:test
```

Compose 配置位于 `infra/compose.yaml`，使用 PostgreSQL 17 和 Redis 7，仅绑定本机 `127.0.0.1:15432`、`127.0.0.1:16379`。默认开发账号、密码和数据库为 `noema`、`noema_local`、`noema`，不用于生产环境；连接串见 `.env.example`。Redis 开启 AOF 和 `noeviction`，PostgreSQL 与 Redis 均使用命名卷保存数据。`infra:up` 会等待两个服务健康。

`db:deploy` 应用已提交的数据库迁移，重复运行不会重建数据；开发新模型后运行 `corepack pnpm db:migrate --name <变更名>` 创建迁移。`db:check` 通过 Nest 的 Prisma provider 执行只读 `SELECT 1`。`db:test` 在当前数据库内创建随机独立 schema，从空结构部署迁移并验证核心实体、关系及约束，结束后删除该测试 schema；连接账号需要创建 schema 的权限。

`prisma/schema.prisma` 定义 10 个核心实体与镜头素材关联表，`prisma/migrations/` 保存迁移。剧本版本、同级场景和镜头顺序、任务幂等键及素材存储键有唯一约束；镜头只能选用已关联的素材。迁移另含正数/非负数约束及防止修改剧本历史、素材存储键和类型的触发器，这些原生 PostgreSQL 约束不能由 Prisma schema 表达。剧本修改需要创建新版本，重新生成素材需要新建 Asset 与存储键；对象存储本身仍需禁止覆盖旧文件。删除项目会级联清理剧集等业务记录，可复用素材与审核记录保留，任务来源关联置空。

根目录 `prisma.config.ts` 管理连接配置，客户端输出到被忽略的 `apps/server/src/generated/prisma/`，服务端开发、构建、测试和类型检查会自动生成。

```sh
corepack pnpm infra:down
```

`infra:down` 停止并移除本项目容器，保留数据卷。修改主机端口或数据库凭据时，同步修改 Compose 与 `.env`；已有 PostgreSQL 数据卷不会因修改环境变量而重建账号或改密。

## 运行最小骨架

完成 `.env` 配置后，在两个终端分别运行：

```sh
corepack pnpm dev:server
corepack pnpm dev:desktop
```

应用分别位于 `apps/server` 和 `apps/desktop`。启动方式与当前范围见[服务端说明](apps/server/README.md)和[桌面端说明](apps/desktop/README.md)。后端启动后可访问 <http://127.0.0.1:3000/health>；桌面启动页暂时独立运行。

## 统一检查

安装依赖后，在仓库根目录运行：

```sh
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

`check` 依次执行 ESLint、Prettier 格式检查和两端 TypeScript 类型检查；`test` 执行工作区已有测试，当前为服务端 HTTP 测试；`build` 构建两端应用。检查和构建不会自动启动桌面窗口。

可单独运行检查或修复格式：

```sh
corepack pnpm lint
corepack pnpm lint:fix
corepack pnpm format:check
corepack pnpm format
corepack pnpm typecheck
```

ESLint 使用根目录 flat config，覆盖两端 TypeScript、React Hooks、配置及测试脚本，并区分 Node.js 与浏览器全局变量。Prettier 统一使用两空格缩进、单引号、无分号、无尾随逗号和 LF 换行。两者忽略依赖、构建产物、本地 worktree 与 `.claude`；Prettier 另行跳过自动生成的锁文件。

构建后可运行桌面端启动检查：

```sh
corepack pnpm --filter @noema/desktop smoke
corepack pnpm --filter @noema/desktop smoke:dev
```

桌面端启动检查需要可用的图形桌面；具体前置条件见桌面端 README。

共享包按需放入 `packages/*`，当前已提供本地数据库、Redis 和 Prisma 连接，尚未接入认证或项目管理。

## 分步开发

每一步保持可独立验证并单独提交。基线提交后，可在 `.worktrees/` 下使用独立分支并行开发桌面端与服务端；共享契约变更应先统一再接入两端。

项目文档统一存放在 [docs/](docs/README.md)。

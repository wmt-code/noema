# Noema

面向个人创作者的 AI 短剧创作平台，采用 Electron + React + TypeScript、NestJS、Pi Agent Core 和 PostgreSQL。

工程方案见 [工程实施计划](docs/engineering-plan.md)，开发进度见 [第一阶段开发步骤](docs/phase-1.md)。

## 开发环境

- Node.js 24 LTS，最低 24.14.1。
- pnpm 12.16.1，由根目录 `packageManager` 字段固定。
- Docker Compose，供后续 PostgreSQL、Redis 开发环境使用。

在仓库根目录运行：

```sh
corepack pnpm install
corepack pnpm --version
```

如系统未安装 Corepack，可使用 `npx --yes pnpm@12.16.1 install`，并通过 `npx --yes pnpm@12.16.1 --filter @noema/server dev` 或 `npx --yes pnpm@12.16.1 --filter @noema/desktop dev` 启动应用；根目录的快捷命令依赖 Corepack。

Electron 45 在首次启动时下载桌面运行时，需要访问官方分发地址；无需单独下载 Playwright 浏览器。使用代理时，需按[桌面端说明](apps/desktop/README.md)设置 Electron 下载器的代理选项。

## 运行最小骨架

在两个终端分别运行：

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

共享包按需放入 `packages/*`，当前尚未接入数据库、认证或项目管理。

## 分步开发

每一步保持可独立验证并单独提交。基线提交后，可在 `.worktrees/` 下使用独立分支并行开发桌面端与服务端；共享契约变更应先统一再接入两端。

项目文档统一存放在 [docs/](docs/README.md)。

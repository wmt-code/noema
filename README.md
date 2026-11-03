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

如系统未安装 Corepack，可使用 `npx --yes pnpm@12.16.1 install`。

当前仅完成 Workspace 基线，尚无应用启动命令。应用分别放在 `apps/*`，共享包放在 `packages/*`，随对应开发步骤创建。

## 分步开发

每一步保持可独立验证并单独提交。基线提交后，可在 `.worktrees/` 下使用独立分支并行开发桌面端与服务端；共享契约变更应先统一再接入两端。

项目文档统一存放在 [docs/](docs/README.md)。

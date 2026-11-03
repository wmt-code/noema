# 第一阶段开发步骤

依据 [工程实施计划](engineering-plan.md) 的 Phase 1 拆分执行，每一步独立验证、独立提交，完成当前步骤后再进入下一步。

| 步骤 | 范围 | 验证标准 | 状态 |
|---|---|---|---|
| 1 | pnpm Workspace、Node.js 与 pnpm 版本、忽略规则、开发文档 | 依赖安装和锁文件校验通过 | 已完成 |
| 2A | Electron + electron-vite + React + TypeScript 最小窗口 | 类型检查、构建通过，桌面窗口可启动 | 骨架已完成，实际窗口验证待 Electron 运行时下载 |
| 2B | NestJS 最小服务与健康检查 | 类型检查、构建和健康接口测试通过 | 已完成 |
| 3 | ESLint、Prettier 及根目录检查命令 | 两端统一检查通过 | 待开发 |
| 4 | Docker Compose 中的 PostgreSQL、Redis 与 Prisma 连接 | 服务健康，Prisma 可连接测试数据库 | 待开发 |
| 5 | 核心数据模型与首个数据库迁移 | 空库迁移通过，关系与约束可验证 | 待开发 |
| 6 | 基础认证与资源归属校验 | 登录、未认证访问、越权访问测试通过 | 待开发 |
| 7 | 项目与剧集管理 API 及共享 Schema | 创建、查询、修改、删除与持久化测试通过 | 待开发 |
| 8 | Tailwind CSS、shadcn/ui、桌面工作台和项目管理页面 | 界面调用真实 API 创建项目、剧集，重启后数据保留 | 待开发 |

## 并行规则

- 步骤 1 提交后，2A 与 2B 可分别在独立 worktree 和分支执行。
- 每个 worktree 安装自己的依赖；不共享 `node_modules`。
- 并行任务限定在各自应用目录，根目录配置与锁文件由集成时统一处理。
- 其余步骤按依赖推进，不为后续阶段预建 Agent、Worker 或模型调用实现。

## 最小骨架的范围

- 桌面端仅包含安全的 Electron 窗口与 React 启动页，暂不调用服务端。
- 后端仅提供进程存活检查；`GET /health` 不代表数据库、Redis 或模型服务可用。
- 根目录提供 `dev:desktop` 和 `dev:server` 入口。每端的类型检查、构建和测试命令见各自 README。
- 两端应用代码分别提交，依赖锁文件与公共启动文档单独集成。

## 桌面端验证记录

- `typecheck`、`build` 通过，包含主进程和 React 渲染入口。
- 当前 Electron 45 官方运行时下载速度较慢，真实窗口、CSP 行为和截图尚未验证；不能将构建通过视为窗口启动通过。
- 运行时下载完成后，先执行 `build`，再运行 `corepack pnpm --filter @noema/desktop smoke`；截图保存到被 Git 忽略的 `apps/desktop/out/smoke.png`。
- 当前没有 preload 桥，因此 electron-vite 构建会提示 `preload config is missing`；后续需要本地能力时再新增。

## 后端验证记录

- `typecheck`、`build` 通过；原生 Node 测试 3 项全部通过，覆盖 `/health`、404、非法端口及端口占用。
- 从编译产物启动独立服务并请求 `/health`，得到 `200 {"status":"ok"}`；检查结束后清理进程。
- 根目录 `corepack pnpm dev:server` 已通过真实启动与 HTTP 核验，兼容未全局安装 pnpm 的环境。

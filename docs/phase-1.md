# 第一阶段开发步骤

依据 [工程实施计划](engineering-plan.md) 的 Phase 1 拆分执行，每一步独立验证、独立提交，完成当前步骤后再进入下一步。

| 步骤 | 范围                                                     | 验证标准                                        | 状态   |
| ---- | -------------------------------------------------------- | ----------------------------------------------- | ------ |
| 1    | pnpm Workspace、Node.js 与 pnpm 版本、忽略规则、开发文档 | 依赖安装和锁文件校验通过                        | 已完成 |
| 2A   | Electron + electron-vite + React + TypeScript 最小窗口   | 类型检查、构建通过，桌面窗口可启动              | 已完成 |
| 2B   | NestJS 最小服务与健康检查                                | 类型检查、构建和健康接口测试通过                | 已完成 |
| 3    | ESLint、Prettier 及根目录检查命令                        | 两端统一检查通过                                | 已完成 |
| 4    | Docker Compose 中的 PostgreSQL、Redis 与 Prisma 连接     | 服务健康，Prisma 可连接测试数据库               | 已完成 |
| 5    | 核心数据模型与首个数据库迁移                             | 空库迁移通过，关系与约束可验证                  | 已完成 |
| 6    | 基础认证与资源归属校验                                   | 登录、未认证访问、越权访问测试通过              | 已完成 |
| 7    | 项目与剧集管理 API 及共享 Schema                         | 创建、查询、修改、删除与持久化测试通过          | 已完成 |
| 8    | Tailwind CSS、shadcn/ui、桌面工作台和项目管理页面        | 界面调用真实 API 创建项目、剧集，重启后数据保留 | 待开发 |

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

## 第三步验证记录

- 根目录 `corepack pnpm check` 通过，包含两端 ESLint、仓库格式检查和严格类型检查。
- `corepack pnpm test` 通过，现有服务端 HTTP 测试 3 项全部通过；`corepack pnpm build` 完成两端构建。
- `corepack pnpm install --frozen-lockfile` 通过，新增工具固定版本并已写入根锁文件。
- 已验证配置能拒绝 TypeScript 未使用变量、条件调用 React Hooks、Node 脚本使用浏览器全局变量及不合规范的格式，并忽略构建产物和本地工作目录。
- 桌面端 `smoke` 与 `smoke:dev` 均通过，生产与开发窗口、安全限制及 HMR 刷新检查通过。

## 第四步验证记录

- `corepack pnpm infra:up` 启动独立的 PostgreSQL 17、Redis 7 并等待健康；服务只绑定本机 15432、16379，不占用已有的 5432。
- `corepack pnpm infra:check` 通过，PostgreSQL 接受连接，Redis 返回 `PONG`；两者使用命名卷保存数据。
- Prisma CLI、客户端与 PostgreSQL 适配器固定为 `7.10.1`；`db:validate`、无模型客户端生成和 `db:check` 均通过，后者通过 Nest 注入 `PrismaService` 执行真实的 `SELECT 1`，随后关闭连接。
- 当前数据库 `public` 下业务表为 0；未提前创建第五步的数据模型或迁移。
- 根目录 `check`、4 项服务端 HTTP 测试、双端构建及 `install --frozen-lockfile` 通过；普通测试无需启动数据库，并验证缺失连接串时启动失败。
- 生产与开发启动入口均从根目录 `.env` 加载连接配置并返回 `200 {"status":"ok"}`；开发入口已验证源码修改后自动重启且不会因编译产物写入而循环重启。开发脚本使用 `process.loadEnvFile`，避免 Node 24 watch 与 `--env-file` 扩大监听范围的问题。

## 第五步验证记录

- `prisma/schema.prisma` 定义 Project、Episode、ScriptRevision、Character、Scene、Shot、Asset、GenerationTask、QualityReview、ExportRecord，核心实体使用 UUID，包含角色与镜头多对多、镜头素材关联及生成输出关系。
- 首个迁移 `20261103000000_init` 已应用到本地开发库；`prisma migrate status` 确认已同步，数据库与 Prisma schema 差异检查通过。迁移使用事务，包含外键、唯一索引、数值 CHECK 约束与历史保护触发器。
- `corepack pnpm db:test` 的 7 项检查通过：在随机独立 schema 中从空结构部署迁移两次，验证实体持久化、关联查询、版本与排序唯一性、幂等键与供应商任务 ID、外键、选用素材归属、数值约束、历史版本和素材防覆盖、费用精度及删除行为；测试结束清理独立 schema，不写入开发业务表。
- 删除项目级联清理剧集、剧本、场景、镜头、生成任务和导出记录；可复用素材及其审核保留，已删除任务的素材来源关联置空。被镜头引用的素材不能直接删除。
- 新增根目录 `db:migrate`、`db:deploy`、`db:test` 入口，补齐根目录与服务端数据库使用说明；普通 `test` 仍无需数据库。
- `db:validate`、`infra:check`、`db:check`、根目录 `check`、4 项 HTTP 测试、双端构建及 `install --frozen-lockfile` 全部通过。认证、资源归属 API 校验和项目管理接口按第六、七步继续实现。

## 第六步验证记录

- `POST /auth/register`、`POST /auth/login`、`GET /auth/me`、`POST /auth/logout` 已实现：scrypt 口令哈希（缺失用户同样推导，防时序探测）、服务端会话表存 SHA-256 令牌哈希、7 天过期，响应不泄露口令哈希并带 `Cache-Control: no-store`。
- `AuthGuard` 全局生效，`/health` 与注册登录标记为公开路由；`OwnershipService.assertOwned` 以 SQL 过滤按归属链校验全部十类资源，资源不存在与越权同样返回 404，不信任请求体传入的归属标识。
- `corepack pnpm db:test` 新增 `auth.integration.mjs` 5 项通过：注册校验与重复 409、登录成功与错误口令 401、缺失/畸形/未知令牌 401、注销后令牌失效与过期会话 401、越权访问 404 与非法 UUID 400；登录注册按 IP 限流。既有 7 项数据库检查不受影响。
- 迁移 `20261103010000_auth_ownership` 在独立 schema 部署两次通过；`db:validate`、`db:check`、根目录 `check`、HTTP 测试与双端构建全部通过。

## 第七步验证记录

- 新增 `packages/shared`（`@noema/shared`）共享包，导出剧集状态常量与项目、剧集的创建/修改输入校验函数，server 通过 workspace 依赖复用，前后端数据契约由同一份 Schema 约束；构建顺序已接入 `dev`、`typecheck`、`build` 脚本。
- `ProjectController` 提供项目与剧集完整 CRUD：项目支持 `POST/GET /projects`、`GET/PATCH/DELETE /projects/:id`，剧集支持 `POST/GET /projects/:projectId/episodes` 与 `GET/PATCH/DELETE /episodes/:id`；所有写操作输入校验失败返回 `400`。
- 全部路由经全局 `AuthGuard` 认证，资源访问先经 `OwnershipService` 按归属链校验，其他用户与不存在的资源统一返回 `404`，项目删除级联清理剧集。
- `corepack pnpm db:test` 新增 `project.integration.mjs` 5 项通过：项目输入校验、项目 CRUD 与列表排序、剧集 CRUD 与状态枚举校验、跨用户访问 404、删除级联与未删除数据持久化；集成测试公共的建库与应用启动逻辑提取为 `database.mjs` 的 `testApp`。全部 19 项通过。
- `db:validate`、`infra:check`、`db:check`、根目录 `check`、`build`、`test`、4 项 HTTP 测试及 `install --frozen-lockfile` 全部通过。

## 桌面端验证记录

- `typecheck`、`build` 通过，包含主进程和 React 渲染入口。
- Electron 45 官方运行时已下载，真实生产窗口、中文渲染、沙箱与隔离、无 Node 访问、CSP、导航与弹窗限制均已验证。
- `corepack pnpm --filter @noema/desktop smoke` 通过，截图已查看，保存到被 Git 忽略的 `apps/desktop/out/smoke.png`；检查前需先执行 `build`。
- `corepack pnpm --filter @noema/desktop smoke:dev` 通过，验证开发窗口、CSP、HMR 消息、整页刷新与其他导航拦截。开发地址固定为 `http://127.0.0.1:5180`，避开本机其他项目占用的 5173。
- 当前没有 preload 桥，因此 electron-vite 构建会提示 `preload config is missing`；后续需要本地能力时再新增。

## 后端验证记录

- `typecheck`、`build` 通过；原生 Node 测试 3 项全部通过，覆盖 `/health`、404、非法端口及端口占用。
- 从编译产物启动独立服务并请求 `/health`，得到 `200 {"status":"ok"}`；检查结束后清理进程。
- 根目录 `corepack pnpm dev:server` 已通过真实启动与 HTTP 核验，兼容未全局安装 pnpm 的环境。

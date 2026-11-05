# Noema Server

最小 NestJS + TypeScript 服务，提供存活检查与 Prisma PostgreSQL provider。使用仓库要求的 Node.js `>=24.14.1 <25` 与 pnpm `12.16.1`。

## 开发与验证

在当前 worktree 根目录执行，依赖安装在本 worktree 中。首次启动前，按[根目录说明](../../README.md)将 `.env.example` 复制为 `.env`：

```sh
corepack pnpm install
corepack pnpm --filter @noema/server dev
```

`dev` 先生成 Prisma 客户端，再使用 Node 原生 watch；修改 `src` 或 `tsconfig.json` 后重新编译并启动，首次运行也会先编译。修改 Prisma schema 后重新运行开发命令。TypeScript 配置启用严格检查、装饰器及装饰器元数据。

```sh
corepack pnpm --filter @noema/server typecheck
corepack pnpm --filter @noema/server build
corepack pnpm --filter @noema/server start
corepack pnpm --filter @noema/server test
```

`start` 运行已有的 `dist/main.js`，需要先构建；`test` 先构建，再用 Node 原生 test/assert/fetch 启动随机端口验证健康接口、404 和启动失败，结束时关闭监听。普通测试使用不可达的数据库地址验证存活检查不依赖数据库，无需 Docker。

真实数据库检查单独执行：

```sh
corepack pnpm infra:up
corepack pnpm infra:check
corepack pnpm db:deploy
corepack pnpm db:check
corepack pnpm db:test
```

`db:deploy` 应用仓库中的迁移。`db:check` 通过 Nest 容器获取 `PrismaService`、连接 PostgreSQL 并执行 `SELECT 1`，随后关闭容器及连接池；它使用当前 `DATABASE_URL`，不会迁移或写入数据库。`db:test` 在随机独立 schema 中从空结构部署迁移两次，验证 10 个核心实体、多对多关联、选用素材、唯一约束、外键、数值范围、历史保护及删除行为，结束后清理测试 schema，不写入 `public` 业务表；账号需有创建 schema 的权限。新增模型变更使用根目录 `corepack pnpm db:migrate --name <变更名>`，提交生成的 SQL 迁移。Redis 通过 Compose 健康检查与 `redis-cli ping` 验证，应用内队列接入在后续阶段实现。

## 环境与接口

| 环境变量       | 默认值 | 规则                                                                                            |
| -------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `PORT`         | `3000` | 仅十进制数字，数值范围 `1`～`65535`；空值、空格、负数、小数和越界值导致启动失败并以非零状态退出 |
| `DATABASE_URL` | 无     | 必填；Prisma 使用的 PostgreSQL 连接串，示例见根目录 `.env.example`                              |
| `REDIS_URL`    | 无     | 为后续队列接入预留，当前应用不读取；本地地址见根目录 `.env.example`                             |

服务固定监听 IPv4 回环地址 `127.0.0.1`，仅供本机访问。开发启动脚本通过 Node 原生 `process.loadEnvFile` 加载根目录 `.env`；`start` 和 `db:check` 使用 `--env-file-if-exists`，终端已设置的环境变量优先。修改 `.env` 后重新运行开发命令。根目录 Prisma CLI 同样加载 `.env`；生成客户端无需数据库或连接串。也可通过启动终端设置环境变量，例如 PowerShell：

```powershell
$env:PORT = '3001'
corepack pnpm --filter @noema/server dev
```

默认请求 `GET http://127.0.0.1:3000/health` 返回 HTTP `200` 和 JSON：

```json
{ "status": "ok" }
```

这是存活检查，表示服务能处理 HTTP 请求；不代表数据库、Redis 或其他外部依赖就绪。Prisma 延迟到首次查询时建立连接，服务启动不强制探测数据库；缺少 `DATABASE_URL` 时启动失败。`PrismaService` 通过 Nest 注入和管理，在应用关闭时释放连接池。未知路由返回 `404`。启动失败会输出错误并以非零状态退出，启用 Nest 关闭钩子以响应退出信号。

## 认证与业务 API

除 `/health`、`POST /auth/register`、`POST /auth/login` 外，所有路由都需要 `Authorization: Bearer <token>`，令牌来自登录响应，7 天有效；`POST /auth/logout` 注销当前会话。注册与登录按来源 IP 限流。请求与响应体由 `@noema/shared` 的校验函数约束。

| 方法     | 路径                            | 说明                                                                   |
| -------- | ------------------------------- | ---------------------------------------------------------------------- |
| `POST`   | `/auth/register`                | 注册，返回 `{ id, email }`；重复邮箱返回 `409`                         |
| `POST`   | `/auth/login`                   | 登录，返回 `accessToken`、`expiresAt` 与用户信息                       |
| `GET`    | `/auth/me`                      | 当前用户                                                               |
| `POST`   | `/auth/logout`                  | 注销当前会话，返回 `204`                                               |
| `POST`   | `/projects`                     | 创建项目，`{ name, settings? }`                                        |
| `GET`    | `/projects`                     | 当前用户的项目，按创建时间倒序                                         |
| `GET`    | `/projects/:id`                 | 项目详情                                                               |
| `PATCH`  | `/projects/:id`                 | 修改 `{ name?, settings? }`，至少一项                                  |
| `DELETE` | `/projects/:id`                 | 删除项目并级联删除剧集，返回 `204`                                     |
| `POST`   | `/projects/:projectId/episodes` | 创建剧集，`{ title, status? }`，状态默认 `DRAFT`                       |
| `GET`    | `/projects/:projectId/episodes` | 剧集列表，按创建时间正序                                               |
| `GET`    | `/episodes/:id`                 | 剧集详情                                                               |
| `PATCH`  | `/episodes/:id`                 | 修改 `{ title?, status? }`，状态取 `DRAFT`、`IN_PROGRESS`、`COMPLETED` |
| `DELETE` | `/episodes/:id`                 | 删除剧集，返回 `204`                                                   |

校验失败返回 `400`；未认证返回 `401`；资源不存在或属于其他用户时统一返回 `404`，不区分两种情况。

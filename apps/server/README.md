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

真实数据库连接检查单独执行：

```sh
corepack pnpm infra:up
corepack pnpm infra:check
corepack pnpm db:check
```

`db:check` 通过 Nest 容器获取 `PrismaService`、连接 PostgreSQL 并执行 `SELECT 1`，随后关闭容器及连接池。它使用当前 `DATABASE_URL`，不会迁移或写入数据库。Redis 此步骤通过 Compose 健康检查与 `redis-cli ping` 验证，应用内队列接入在后续阶段实现。

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

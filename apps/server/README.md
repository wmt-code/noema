# Noema Server

阶段 2B 的最小 NestJS + TypeScript 服务。使用仓库要求的 Node.js `>=24.14.1 <25` 与 pnpm `12.16.1`。

## 开发与验证

在当前 worktree 根目录执行，依赖安装在本 worktree 中：

```sh
corepack pnpm install
corepack pnpm --filter @noema/server dev
```

`dev` 使用 Node 原生 watch；修改 `src` 或 `tsconfig.json` 后重新编译并启动，首次运行也会先编译。TypeScript 配置启用严格检查、装饰器及装饰器元数据。

```sh
corepack pnpm --filter @noema/server typecheck
corepack pnpm --filter @noema/server build
corepack pnpm --filter @noema/server start
corepack pnpm --filter @noema/server test
```

`start` 运行已有的 `dist/main.js`，需要先构建；`test` 先编译，再用 Node 原生 test/assert/fetch 启动随机端口验证健康接口、404 和启动失败，结束时关闭监听。

## 环境与接口

| 环境变量 | 默认值 | 规则                                                                                            |
| -------- | ------ | ----------------------------------------------------------------------------------------------- |
| `PORT`   | `3000` | 仅十进制数字，数值范围 `1`～`65535`；空值、空格、负数、小数和越界值导致启动失败并以非零状态退出 |

服务固定监听 IPv4 回环地址 `127.0.0.1`，仅供本机访问。不会自动加载 `.env`；通过启动终端设置环境变量，例如 PowerShell：

```powershell
$env:PORT = '3001'
corepack pnpm --filter @noema/server dev
```

默认请求 `GET http://127.0.0.1:3000/health` 返回 HTTP `200` 和 JSON：

```json
{ "status": "ok" }
```

这是存活检查，表示服务能处理 HTTP 请求；不代表数据库、Redis 或其他外部依赖就绪。未知路由返回 `404`。启动失败会输出错误并以非零状态退出，启用 Nest 关闭钩子以响应退出信号。

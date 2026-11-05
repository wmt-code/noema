# Noema 桌面端

Electron + React + TypeScript 桌面工作台，使用 Tailwind CSS 4 和 shadcn/ui，支持注册登录、项目管理和剧集管理。

## 启动

Node.js `>=24.14.1 <25`，pnpm `12.16.1`。在仓库根目录准备 `.env`，启动基础设施并应用迁移：

```sh
corepack pnpm install
corepack pnpm infra:up
corepack pnpm db:deploy
```

在两个终端分别运行：

```sh
corepack pnpm dev:server
corepack pnpm dev:desktop
```

桌面端默认连接 `http://127.0.0.1:3000`。可在启动桌面端的终端中设置 `NOEMA_API_URL`，只接受 HTTPS origin 或 `http://127.0.0.1:<port>`。开发渲染地址固定为 `http://127.0.0.1:5180`，端口占用时直接失败。无需给服务端开启 CORS。

## 功能

- 注册、登录、退出登录和会话恢复；密码至少 12 个字符，不超过 128 个 UTF-8 字节。
- 项目创建、搜索、排序、重命名和删除。
- 剧集创建、搜索、按状态筛选、编辑名称与状态、删除。
- 删除前确认；请求失败保留表单内容，列表支持刷新重试。

项目和剧集保存在服务端 PostgreSQL。会话令牌仅在主进程使用，通过 Electron `safeStorage` 加密后保存在用户数据目录，与服务端地址绑定；系统不支持加密时仅在本次进程中保留。退出登录会注销服务端会话并删除本地凭据。更换服务端地址需要重新登录。

## 检查

```sh
corepack pnpm --filter @noema/desktop typecheck
corepack pnpm build
corepack pnpm --filter @noema/desktop smoke
corepack pnpm --filter @noema/desktop smoke:dev
corepack pnpm --filter @noema/desktop smoke:projects
```

`build` 输出 `out/main`、`out/preload`、`out/renderer`，不生成安装包。三个 smoke 命令需要已构建的桌面应用和可运行 Electron 的图形桌面。`smoke:projects` 还需要根目录 `.env`、已构建的服务端和可连接的 PostgreSQL；测试自动创建独立 schema、临时用户数据目录和服务端，结束后清理，不写入开发业务数据。

- `smoke`：生产窗口、注册登录切换、沙箱、IPC 桥、CSP、弹窗与导航限制、窄屏溢出，截图 `out/smoke.png`。
- `smoke:dev`：开发窗口、IPC、CSP、HMR 消息与整页刷新。
- `smoke:projects`：真实界面完成项目与剧集增删改查、状态筛选、服务错误、重启持久化和退出登录，截图 `out/projects.png`。

Electron 45 首次启动会下载本平台官方运行时。使用 HTTP(S) 代理时设置 `ELECTRON_GET_USE_PROXY=1`。测试复用 Electron 内置 Chromium，无需另行下载浏览器，也不会关闭沙箱。

## 桌面边界

保留原生窗口边框，启用 `contextIsolation` 和 `sandbox`，关闭 `nodeIntegration`。Preload 只暴露固定业务请求；主进程校验请求来源、资源 ID 和共享输入 Schema，不暴露任意 URL、文件路径或 IPC 通道。

生产渲染页禁止直接联网，脚本只加载本地资源；样式允许本地文件和 Radix 滚动锁、弹窗及菜单所需的动态内联样式。开发环境额外允许 Vite 脚本和固定回环地址的 HMR 连接。阻止页面导航、重定向、新窗口和权限请求。

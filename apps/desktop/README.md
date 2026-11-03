# Noema 桌面端

阶段 2A：Electron + electron-vite + React + TypeScript 最小窗口，仅提供中文静态启动页。

## 环境与命令

在仓库根目录使用 Node.js `>=24.14.1 <25` 和 pnpm `12.16.1`。未启用 pnpm 命令时可把下列 `pnpm` 替换为 `corepack pnpm`。

```sh
pnpm install
pnpm --filter @noema/desktop dev
pnpm --filter @noema/desktop typecheck
pnpm --filter @noema/desktop build
# 必须先 build；需要能运行 Electron 的桌面会话。
pnpm --filter @noema/desktop smoke
pnpm --filter @noema/desktop smoke:dev
```

依赖版本均固定于本应用的 `package.json`。应用源码使用严格类型检查；主进程配置的 `skipLibCheck` 只跳过第三方声明检查，避免 electron-vite 对未使用的可选 SWC 类型的直接引用。Electron 45 首次启动时按需下载本平台官方二进制，需能访问 GitHub Releases；该版本没有安装生命周期脚本，无需配置 pnpm `allowBuilds`。不需要下载 Playwright 浏览器。使用 HTTP(S) 代理时，下载器还需要环境变量 `ELECTRON_GET_USE_PROXY=1`。根锁文件由集成步骤统一更新。

`dev` 只监听 `http://127.0.0.1:5180`，端口占用时直接失败。`build` 输出 `out/main` 与 `out/renderer`，并不生成安装包。`smoke` 用已安装的 Electron 启动构建产物，检查真实中文渲染、隔离与沙箱设置、无 Node 访问、生产 CSP、弹窗和导航限制、窄屏溢出；保存 `out/smoke.png` 后关闭应用。`smoke:dev` 同样需要先构建，验证真实开发窗口、CSP、HMR 消息、整页刷新及其他导航拦截，结束后关闭窗口和测试 Vite 服务。无图形桌面的环境需另行配置显示服务；脚本不会关闭沙箱来绕过环境限制。

## 安全与范围

启用 `contextIsolation`、`sandbox`，关闭 `nodeIntegration`，没有 preload 桥或 IPC。阻止页面发起的导航、重定向、新窗口和权限请求；开发模式仅允许主窗口刷新当前启动页，支持 Vite 整页重载。生产页面仅加载本地脚本和样式；开发 CSP 另行允许 Vite 注入的脚本、样式和固定回环地址的 HMR 连接，该放行不会进入构建产物。

本步骤没有项目管理、服务端连接、文件系统接口、FFmpeg、Tailwind/shadcn、打包与自动更新；这些按后续步骤接入。当前界面固定浅色，保留原生窗口边框，无可用业务操作。

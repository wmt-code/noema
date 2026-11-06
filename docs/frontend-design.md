# Noema 工作台界面

当前工作台直接移植 [Studio Admin 的 Logistics 页面](https://studio-admin.arhamkhnz.com/dashboard/logistics)。来源为 [arhamkhnz/next-shadcn-admin-dashboard 的固定版本 036631e](https://github.com/arhamkhnz/next-shadcn-admin-dashboard/tree/036631eb6896817649272fe79ded8c80faa709ee)，MIT 授权文本随桌面应用发布在 `public/licenses/studio-admin.txt`。

| 原版源码（`src/app/(main)/dashboard/logistics/_components/`） | Noema（`apps/desktop/src/renderer/src/logistics/`） | 业务替换                                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `logistics.tsx`                                               | `logistics.tsx`                                     | 保留 400px 列表栏与右侧分区；宽度小于 1024px 时点选项目打开详情抽屉。                                            |
| `shipment-list.tsx`                                           | `project-list.tsx`                                  | 货运记录替换为真实项目，保留列表卡片、选中样式、搜索与分页签，接入新建、排序与刷新。                             |
| `shipment-details.tsx`                                        | `project-details.tsx`                               | 上半区由路线地图替换为剧集，支持创建、编辑、删除、搜索和状态筛选；下半区呈现项目资料及按剧集状态统计的制作进度。 |

外层布局取自同一仓库的 `dashboard/layout.tsx`、`_components/sidebar/`、`_components/header/theme-switcher.tsx` 和 `auth/v1/login/page.tsx`，在本地 `layout/` 下适配。移植保留原版中性主题和 Geist 字体。登录、注册和账号菜单使用现有桌面会话；侧栏只列可用操作和真实项目。演示物流数据、地图、Next.js 路由与在线字体均未引入运行时。

官方 shadcn CLI 使用与上游一致的 `radix-nova`、`neutral` 配置。移动导航保留原项目的中文无障碍说明和关闭时的焦点恢复；类型适配与 lint 豁免仅针对具体的官方源码行。`styles/shadcn.css` 来自 shadcn 包的 Tailwind 辅助样式，字体及样式许可证位于 `public/licenses/`。

运行 `corepack pnpm check`、`corepack pnpm build` 和桌面端的 `smoke`、`smoke:projects` 可验证运行结果。工作台集成测试使用隔离的数据库架构，覆盖项目与剧集增删改、制作进度、会话恢复、网络错误、窄屏抽屉及键盘焦点；截图输出到 `apps/desktop/out/`。

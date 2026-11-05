# Noema 前端设计

## 已确认的视觉基准

采用 ARTEX 默认浅色主题和用户确认的项目页、登录页概念稿。参考本地 `D:/github_rep/ARTEX/web/src/app/globals.css` 与 `screenshots/dashboard.png`、`screenshots/tasks.png`，不引入 ARTEX 的业务功能或品牌素材。

项目页基准：[workspace-concept.png](design-assets/workspace-concept.png)。登录页基准：[login-concept.png](design-assets/login-concept.png)。概念图中的项目名称和日期仅用于排版；应用始终读取实际数据。

| 角色       | 色值      |
| ---------- | --------- |
| 内容背景   | `#FFFFFF` |
| 侧栏       | `#FAFAFA` |
| 选中、悬停 | `#F5F5F5` |
| 主文字     | `#0A0A0A` |
| 辅助文字   | `#737373` |
| 主按钮     | `#171717` |
| 边框       | `#E5E5E5` |
| 登录插画区 | `#F7F7F7` |

字体沿用 Segoe UI Variable、Microsoft YaHei UI、PingFang SC 系统无衬线字体，图标沿用 Lucide。页面保留浅色主题及品牌素材；控件以 shadcn/ui 官方默认设计为准，不再按概念稿单独调整控件外观。

## 组件规范与布局

- 使用 shadcn CLI 4.23.0 从官方 `@shadcn` 注册表安装 `new-york` / Radix 组件。页面直接组合官方组件，不添加通用二次封装，具体约束见根目录 `AGENTS.md`。
- 排序、状态筛选和剧集编辑状态统一使用 `Select`，沿用默认文字、箭头和选中标记排列。工具栏选择器只设置布局宽度，不使用原有居中样式覆盖。
- 导航使用 `Sidebar`，面包屑使用 `Breadcrumb`，项目与剧集列表使用 `Table`，状态使用 `Badge` 内置变体，账号使用 `Avatar`。
- 表单使用 `FieldGroup`、`FieldLabel` 和 `Input`；搜索使用 `InputGroup`；操作使用 `Button`、`DropdownMenu`，编辑使用 `Dialog`，删除确认使用 `AlertDialog`。
- 错误提示使用 `Alert`，加载反馈使用 `Spinner`，空状态使用 `Empty`。项目和剧集均保留顶部新建按钮，空状态仅在筛选无结果时提供清除操作。
- 登录与注册保持 52:48 双栏，768px 以下隐藏插画。侧栏使用官方移动端 Sheet 行为，选择项目或扩大窗口后关闭；窄屏将日期和状态移至名称下方，短窗口允许内容滚动。
- 保留注册、登录、会话恢复、项目及剧集管理、搜索筛选、校验、删除确认、失败保留表单和重试。无 API 或数据库变更。

官方源码仅做中文无障碍文案适配及必要兼容处理。`SidebarMenuSkeleton` 的随机宽度和 `use-mobile` 的首次状态同步保留官方实现，仅在具体行豁免对应 React lint 规则，不放宽业务代码检查。

桌面回归复现了官方 Sidebar 的移动抽屉关闭后焦点丢失：`SidebarTrigger` 不在 Sheet 内，Radix 无法自动找到触发器。仅在官方 Sidebar 内记录打开前焦点并于关闭时恢复，不调整视觉结构，保留 Escape 焦点恢复测试。

## 原创素材

2026-11-05 使用内置 Image Gen 生成，素材在本地加载。

- `design-assets/noema-icon-original.png`：透明外缘、黑色圆角方形、白色几何 N。提示词核心：简洁电影画框意象，粗笔画，16px 可识别，无额外文字。
- `design-assets/storyboard-original.png`：浅灰背景上的白色分镜画框与胶片纸雕。提示词核心：高调中性灰白摄影、柔和日光、建筑门洞与地平线、上方留白，无文字或品牌。
- 应用资源位于 `apps/desktop/src/renderer/public/brand/`：16、32、48、180、256、512px PNG；含 16/32/48/64/128/256px 的 ICO；压缩 WebP 插画。原始 PNG 保存在文档目录，不随应用发布。
- 同一图标用于品牌、favicon、Apple touch icon 与 Electron 窗口。`img-src 'self'` 允许本地资源；其余内容安全限制保留。

## 参考来源

- [Linear 的界面改版](https://linear.app/now/behind-the-latest-design-refresh)：一致的操作位置与清晰的信息层级。
- [StudioBinder](https://www.studiobinder.com/storyboard-software/)：影视制作的信息组织参考。
- [Unsplash 影院照片](https://unsplash.com/photos/empty-movie-theater-with-a-lit-screen-dXpJeKIWfGs)：前期氛围调研，未用于最终产品。

## 验证

执行根目录 `corepack pnpm check`、桌面端构建及 `smoke`、`smoke:projects`。使用真实 Electron 验证认证、项目与剧集增删改、标准 Select 切换、键盘操作、删除确认、失败提示、会话恢复、素材加载和 CSP。

布局覆盖 1440×1024、1280×820、390px 窄屏及 400px 短窗口。官方 Sheet 有入场动画，测试等待动画结束后测量边界；排序控件验证固定宽度和官方 Select 结构，不再要求自定义的文字箭头组合居中。

## 官方组件参考

- [shadcn/ui 组件](https://ui.shadcn.com/docs/components)
- [Select](https://ui.shadcn.com/docs/components/radix/select)
- [Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar)
- [Field](https://ui.shadcn.com/docs/components/radix/field)
- [Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog)

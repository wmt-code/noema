# Graph Report - studio-dashboard  (2026-11-06)

## Corpus Check
- 94 files · ~242,643 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 783 nodes · 1162 edges · 56 communities (46 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6acbecb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthRequest
- 第一阶段开发步骤
- dependencies
- dependencies
- scripts
- main/api.ts
- sheet.tsx
- devDependencies
- sidebar.tsx
- compilerOptions
- components.json
- project-details.tsx
- compilerOptions
- tsconfig.web.json
- database.mjs
- include
- src/index.ts
- compilerOptions
- shared/package.json
- 3. 业务模块设计
- 代码提交规范
- dialog.tsx
- AI 真人短剧创作平台 — Engineering Plan
- 11. 实施计划
- nav-user.tsx
- 6. AI 生成任务设计
- .prettierrc.json
- 20261103000000_init/migration.sql
- 2. 技术架构
- 5. Agent 设计
- 7. 质量审核设计
- 9. 桌面端工程设计
- smoke.mjs
- smoke-dev.mjs
- field.tsx
- health.test.mjs
- 1. 项目目标
- 4. 数据模型
- 8. API 与事件契约
- input-group.tsx
- dev.mjs
- App.tsx
- select.tsx
- app-sidebar.tsx
- dashboard-layout.tsx
- Workspace
- AGENTS.md
- alert.tsx
- Project
- project-list.tsx

## God Nodes (most connected - your core abstractions)
1. `scripts` - 20 edges
2. `AuthRequest` - 19 edges
3. `compilerOptions` - 15 edges
4. `compilerOptions` - 15 edges
5. `ProjectController` - 14 edges
6. `AI 真人短剧创作平台 — Engineering Plan` - 14 edges
7. `Workspace()` - 13 edges
8. `AuthService` - 13 edges
9. `compilerOptions` - 13 edges
10. `Button()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `status()`  [INFERRED]
  apps/desktop/src/renderer/src/App.tsx → apps/server/test/agent.test.mjs
- `Project` --references--> `"User"`  [EXTRACTED]
  apps/desktop/src/shared/api.ts → prisma/migrations/20261103010000_auth_ownership/migration.sql
- `Workspace()` --calls--> `useSidebar()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/components/ui/sidebar.tsx
- `Workspace()` --calls--> `date()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/logistics/project-format.ts
- `logout()` --calls--> `request()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (56 total, 4 thin omitted)

### Community 0 - "AuthRequest"
Cohesion: 0.05
Nodes (45): AgentDefinition, AgentScope, AgentService, limitsSchema, Injectable, AppModule, AuthController, Response (+37 more)

### Community 1 - "第一阶段开发步骤"
Cohesion: 0.05
Nodes (32): Noema 桌面端, 功能, 启动, 桌面边界, 检查, Noema Server, 开发与验证, 环境与接口 (+24 more)

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, @earendil-works/pi-agent-core, @earendil-works/pi-ai, @nestjs/common, @nestjs/core, @nestjs/platform-express, @noema/shared, @prisma/adapter-pg (+33 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (32): dependencies, class-variance-authority, clsx, cn, lucide-react, @noema/shared, radix-ui, react (+24 more)

### Community 4 - "scripts"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, globals, description, devDependencies, eslint (+36 more)

### Community 5 - "main/api.ts"
Cohesion: 0.16
Nodes (15): forgetSession(), handleRequest(), HttpError, perform(), restoreSession(), send(), serviceUrl(), sessionFile() (+7 more)

### Community 6 - "sheet.tsx"
Cohesion: 0.20
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), Logistics(), LogisticsProps

### Community 7 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, electron, electron-vite, playwright-core, tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node (+17 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.10
Nodes (12): SidebarContext, SidebarContextProps, SidebarGroup(), SidebarGroupContent(), SidebarGroupLabel(), SidebarProvider(), Skeleton(), Tooltip() (+4 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError (+11 more)

### Community 10 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "project-details.tsx"
Cohesion: 0.19
Nodes (13): Badge(), badgeVariants, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ProjectDetails() (+5 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError, outDir (+8 more)

### Community 13 - "tsconfig.web.json"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, types, extends, include, DOM, ES2022 (+5 more)

### Community 14 - "database.mjs"
Cohesion: 0.13
Nodes (14): appDirectory, definition(), model, readTool(), response(), toolCall(), input, scope (+6 more)

### Community 15 - "include"
Cohesion: 0.13
Nodes (14): compilerOptions, lib, skipLibCheck, types, extends, include, DOM, ES2022 (+6 more)

### Community 16 - "src/index.ts"
Cohesion: 0.30
Nodes (14): EPISODE_STATUSES, EpisodeCreate, EpisodePatch, EpisodeStatus, fields(), object(), parseEpisodeCreate(), parseEpisodePatch() (+6 more)

### Community 17 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, exactOptionalPropertyTypes, isolatedModules, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 18 - "shared/package.json"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, exports, typescript, name, private, scripts, build (+4 more)

### Community 19 - "3. 业务模块设计"
Cohesion: 0.25
Nodes (8): 3.1 Project, 3.2 Script, 3.3 Character & Scene, 3.4 Storyboard, 3.5 Generation, 3.6 Review, 3.7 Editor & Export, 3. 业务模块设计

### Community 20 - "代码提交规范"
Cohesion: 0.29
Nodes (6): 代码提交规范, 使用方式, 工单引用, 格式, 示例, 类型

### Community 21 - "dialog.tsx"
Cohesion: 0.15
Nodes (9): Button(), buttonVariants, Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle() (+1 more)

### Community 22 - "AI 真人短剧创作平台 — Engineering Plan"
Cohesion: 0.33
Nodes (6): 10. 项目结构, 12.1 测试策略, 12.2 工程要求, 12. 测试与工程质量, 13. MVP 验收标准, AI 真人短剧创作平台 — Engineering Plan

### Community 23 - "11. 实施计划"
Cohesion: 0.33
Nodes (6): 11. 实施计划, Phase 1 — 工程基础与项目管理, Phase 2 — Agent 创作与分镜, Phase 3 — AI 媒体生成, Phase 4 — 质量审核与成片, Phase 5 — 集成测试与交付

### Community 24 - "nav-user.tsx"
Cohesion: 0.17
Nodes (7): DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuSeparator(), DropdownMenuTrigger()

### Community 25 - "6. AI 生成任务设计"
Cohesion: 0.40
Nodes (5): 6.1 任务状态, 6.2 任务执行流程, 6.3 幂等与失败处理, 6.4 成本控制, 6. AI 生成任务设计

### Community 26 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): endOfLine, semi, singleQuote, trailingComma

### Community 27 - "20261103000000_init/migration.sql"
Cohesion: 0.60
Nodes (4): "Asset_content_immutable", reject_asset_content_update(), reject_script_revision_update(), "ScriptRevision_immutable"

### Community 28 - "2. 技术架构"
Cohesion: 0.50
Nodes (4): 2.1 技术栈, 2.2 系统架构, 2.3 模块职责, 2. 技术架构

### Community 29 - "5. Agent 设计"
Cohesion: 0.50
Nodes (4): 5.1 Agent 职责, 5.2 Agent 执行机制, 5.3 工作流编排, 5. Agent 设计

### Community 30 - "7. 质量审核设计"
Cohesion: 0.50
Nodes (4): 7.1 审核流程, 7.2 技术审核, 7.3 视觉审核, 7. 质量审核设计

### Community 31 - "9. 桌面端工程设计"
Cohesion: 0.50
Nodes (4): 9.1 进程划分, 9.2 素材处理, 9.3 安全要求, 9. 桌面端工程设计

### Community 34 - "field.tsx"
Cohesion: 0.15
Nodes (6): Field(), FieldGroup(), FieldLabel(), fieldVariants, Label(), Separator()

### Community 36 - "1. 项目目标"
Cohesion: 0.67
Nodes (3): 1.1 核心工作流, 1.2 MVP 交付目标, 1. 项目目标

### Community 37 - "4. 数据模型"
Cohesion: 0.67
Nodes (3): 4.1 核心实体, 4.2 数据约束, 4. 数据模型

### Community 38 - "8. API 与事件契约"
Cohesion: 0.67
Nodes (3): 8.1 REST API, 8.2 实时事件, 8. API 与事件契约

### Community 40 - "input-group.tsx"
Cohesion: 0.21
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), Input(), Textarea()

### Community 46 - "App.tsx"
Cohesion: 0.13
Nodes (15): Editor, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+7 more)

### Community 47 - "select.tsx"
Cohesion: 0.18
Nodes (6): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectTrigger(), SelectValue()

### Community 48 - "app-sidebar.tsx"
Cohesion: 0.18
Nodes (12): Sidebar(), SidebarContent(), SidebarFooter(), SidebarHeader(), SidebarMenu(), SidebarMenuButton(), sidebarMenuButtonVariants, SidebarMenuItem() (+4 more)

### Community 49 - "dashboard-layout.tsx"
Cohesion: 0.18
Nodes (6): Avatar(), AvatarFallback(), SidebarInset(), SidebarTrigger(), DashboardLayout(), ThemeSwitcher()

### Community 50 - "Workspace"
Cohesion: 0.14
Nodes (15): App(), Auth(), submit(), message(), Workspace(), logout(), openEditor(), projectMenu() (+7 more)

### Community 52 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): Git 协作规范, Graphify, 前端模板使用规范, 前端组件规范

### Community 53 - "alert.tsx"
Cohesion: 0.40
Nodes (3): Alert(), AlertDescription(), alertVariants

### Community 54 - "Project"
Cohesion: 0.50
Nodes (4): Project, "Asset", "Session", "User"

### Community 55 - "project-list.tsx"
Cohesion: 0.13
Nodes (16): Card(), CardAction(), CardContent(), CardHeader(), CardTitle(), Empty(), EmptyContent(), EmptyDescription() (+8 more)

## Knowledge Gaps
- **284 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `endOfLine`, `$schema` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 383 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `status()` connect `Workspace` to `database.mjs`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Workspace()` connect `Workspace` to `app-sidebar.tsx`, `project-details.tsx`, `App.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.0545308740978348 - nodes in this community are weakly interconnected._
- **Should `第一阶段开发步骤` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
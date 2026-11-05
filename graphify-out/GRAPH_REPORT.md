# Graph Report - noema  (2026-11-05)

## Corpus Check
- 77 files · ~237,137 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 714 nodes · 979 edges · 54 communities (42 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `537a54e2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthRequest
- 第一阶段开发步骤
- dependencies
- dependencies
- scripts
- main/api.ts
- Workspace
- devDependencies
- sidebar.tsx
- compilerOptions
- components.json
- App.tsx
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
- dropdown-menu.tsx
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
- alert-dialog.tsx
- select.tsx
- empty.tsx
- avatar.tsx
- App
- alert.tsx
- AGENTS.md
- badge.tsx

## God Nodes (most connected - your core abstractions)
1. `scripts` - 20 edges
2. `AuthRequest` - 17 edges
3. `compilerOptions` - 15 edges
4. `ProjectController` - 14 edges
5. `compilerOptions` - 14 edges
6. `AI 真人短剧创作平台 — Engineering Plan` - 14 edges
7. `AuthService` - 13 edges
8. `compilerOptions` - 13 edges
9. `Workspace()` - 12 edges
10. `PrismaService` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Project` --references--> `"User"`  [EXTRACTED]
  apps/desktop/src/shared/api.ts → prisma/migrations/20261103010000_auth_ownership/migration.sql
- `App()` --calls--> `request()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/lib/api.ts
- `Workspace()` --calls--> `useSidebar()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/components/ui/sidebar.tsx
- `logout()` --calls--> `request()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/lib/api.ts
- `Workspace()` --calls--> `request()`  [EXTRACTED]
  apps/desktop/src/renderer/src/App.tsx → apps/desktop/src/renderer/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (54 total, 7 thin omitted)

### Community 0 - "AuthRequest"
Cohesion: 0.06
Nodes (40): AppModule, AuthController, Response, Body, Controller, Get, HttpCode, Post (+32 more)

### Community 1 - "第一阶段开发步骤"
Cohesion: 0.05
Nodes (34): Noema 桌面端, 功能, 启动, 桌面边界, 检查, Noema Server, 开发与验证, 环境与接口 (+26 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @nestjs/common, @nestjs/core, @nestjs/platform-express, @noema/shared, @prisma/adapter-pg, @prisma/client, reflect-metadata (+27 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (32): dependencies, class-variance-authority, clsx, cn, lucide-react, @noema/shared, radix-ui, react (+24 more)

### Community 4 - "scripts"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, globals, description, devDependencies, eslint (+36 more)

### Community 5 - "main/api.ts"
Cohesion: 0.12
Nodes (19): forgetSession(), handleRequest(), HttpError, perform(), restoreSession(), send(), serviceUrl(), sessionFile() (+11 more)

### Community 6 - "Workspace"
Cohesion: 0.23
Nodes (9): date(), Workspace(), logout(), openEditor(), projectMenu(), save(), selectProject(), ApiError (+1 more)

### Community 7 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, electron, electron-vite, playwright-core, tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node (+17 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.06
Nodes (30): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), Sidebar(), SidebarContent(), SidebarContext (+22 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError (+10 more)

### Community 10 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "App.tsx"
Cohesion: 0.14
Nodes (15): Editor, statuses, Breadcrumb(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator() (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError, outDir (+8 more)

### Community 13 - "tsconfig.web.json"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, types, extends, include, DOM, ES2022 (+5 more)

### Community 14 - "database.mjs"
Cohesion: 0.20
Nodes (7): appDirectory, deploy(), prismaCli, require, root, testApp(), testDatabase()

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
Cohesion: 0.16
Nodes (8): Button(), buttonVariants, Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle()

### Community 22 - "AI 真人短剧创作平台 — Engineering Plan"
Cohesion: 0.33
Nodes (6): 10. 项目结构, 12.1 测试策略, 12.2 工程要求, 12. 测试与工程质量, 13. MVP 验收标准, AI 真人短剧创作平台 — Engineering Plan

### Community 23 - "11. 实施计划"
Cohesion: 0.33
Nodes (6): 11. 实施计划, Phase 1 — 工程基础与项目管理, Phase 2 — Agent 创作与分镜, Phase 3 — AI 媒体生成, Phase 4 — 质量审核与成片, Phase 5 — 集成测试与交付

### Community 24 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (5): DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuTrigger()

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

### Community 46 - "alert-dialog.tsx"
Cohesion: 0.15
Nodes (8): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogTitle()

### Community 47 - "select.tsx"
Cohesion: 0.18
Nodes (6): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectTrigger(), SelectValue()

### Community 48 - "empty.tsx"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 50 - "App"
Cohesion: 0.33
Nodes (5): App(), Auth(), submit(), message(), root

### Community 51 - "alert.tsx"
Cohesion: 0.50
Nodes (3): Alert(), AlertDescription(), alertVariants

## Knowledge Gaps
- **274 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `endOfLine`, `$schema` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AI 真人短剧创作平台 — Engineering Plan` connect `AI 真人短剧创作平台 — Engineering Plan` to `第一阶段开发步骤`, `1. 项目目标`, `4. 数据模型`, `8. API 与事件契约`, `3. 业务模块设计`, `11. 实施计划`, `6. AI 生成任务设计`, `2. 技术架构`, `5. Agent 设计`, `7. 质量审核设计`, `9. 桌面端工程设计`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Workspace()` connect `Workspace` to `sidebar.tsx`, `App`, `App.tsx`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.06037000973709834 - nodes in this community are weakly interconnected._
- **Should `第一阶段开发步骤` be split into smaller, more focused modules?**
  _Cohesion score 0.0524390243902439 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
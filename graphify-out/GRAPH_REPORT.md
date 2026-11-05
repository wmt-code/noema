# Graph Report - noema  (2026-11-05)

## Corpus Check
- 58 files · ~230,988 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 557 nodes · 698 edges · 47 communities (34 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `196bf2da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.module.ts
- 第一阶段开发步骤
- dependencies
- desktop/package.json
- scripts
- main/api.ts
- App.tsx
- devDependencies
- AuthRequest
- compilerOptions
- components.json
- devDependencies
- compilerOptions
- compilerOptions
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
- button.tsx
- health.test.mjs
- 1. 项目目标
- 4. 数据模型
- 8. API 与事件契约
- dev.mjs

## God Nodes (most connected - your core abstractions)
1. `scripts` - 20 edges
2. `AuthRequest` - 17 edges
3. `ProjectController` - 14 edges
4. `compilerOptions` - 14 edges
5. `AI 真人短剧创作平台 — Engineering Plan` - 14 edges
6. `compilerOptions` - 13 edges
7. `AuthService` - 13 edges
8. `compilerOptions` - 13 edges
9. `PrismaService` - 11 edges
10. `第一阶段开发步骤` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Project` --references--> `"User"`  [EXTRACTED]
  apps/desktop/src/shared/api.ts → prisma/migrations/20261103010000_auth_ownership/migration.sql
- `Window` --references--> `DesktopApi`  [EXTRACTED]
  apps/desktop/src/renderer/src/env.d.ts → apps/desktop/src/shared/api.ts
- `HealthController` --references--> `Public()`  [EXTRACTED]
  apps/server/src/health.controller.ts → apps/server/src/auth.guard.ts

## Import Cycles
- None detected.

## Communities (47 total, 6 thin omitted)

### Community 0 - "app.module.ts"
Cohesion: 0.07
Nodes (28): AppModule, AuthController, Response, Body, Controller, Get, HttpCode, Post (+20 more)

### Community 1 - "第一阶段开发步骤"
Cohesion: 0.05
Nodes (34): Noema 桌面端, 功能, 启动, 桌面边界, 检查, Noema Server, 开发与验证, 环境与接口 (+26 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @nestjs/common, @nestjs/core, @nestjs/platform-express, @noema/shared, @prisma/adapter-pg, @prisma/client, reflect-metadata (+27 more)

### Community 3 - "desktop/package.json"
Cohesion: 0.06
Nodes (30): dependencies, class-variance-authority, clsx, lucide-react, @noema/shared, radix-ui, react, react-dom (+22 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (27): description, engines, node, name, packageManager, private, scripts, build (+19 more)

### Community 5 - "main/api.ts"
Cohesion: 0.13
Nodes (17): forgetSession(), handleRequest(), HttpError, perform(), restoreSession(), send(), serviceUrl(), sessionFile() (+9 more)

### Community 6 - "App.tsx"
Cohesion: 0.10
Nodes (17): App(), Auth(), submit(), date(), Editor, message(), statuses, Workspace() (+9 more)

### Community 7 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, electron, electron-vite, playwright-core, tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node (+17 more)

### Community 8 - "AuthRequest"
Cohesion: 0.26
Nodes (12): AuthRequest, parse(), ProjectController, Body, Controller, Get, HttpCode, Post (+4 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError (+10 more)

### Community 10 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, eslint, eslint-config-prettier (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError, outDir (+8 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, paths, types, extends, include (+7 more)

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
Cohesion: 0.14
Nodes (13): compilerOptions, exactOptionalPropertyTypes, isolatedModules, module, moduleResolution, noEmit, noFallthroughCasesInSwitch, noUncheckedIndexedAccess (+5 more)

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
Cohesion: 0.33
Nodes (4): Dialog, DialogDescription, DialogTitle, DialogTrigger

### Community 22 - "AI 真人短剧创作平台 — Engineering Plan"
Cohesion: 0.33
Nodes (6): 10. 项目结构, 12.1 测试策略, 12.2 工程要求, 12. 测试与工程质量, 13. MVP 验收标准, AI 真人短剧创作平台 — Engineering Plan

### Community 23 - "11. 实施计划"
Cohesion: 0.33
Nodes (6): 11. 实施计划, Phase 1 — 工程基础与项目管理, Phase 2 — Agent 创作与分镜, Phase 3 — AI 媒体生成, Phase 4 — 质量审核与成片, Phase 5 — 集成测试与交付

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

### Community 36 - "1. 项目目标"
Cohesion: 0.67
Nodes (3): 1.1 核心工作流, 1.2 MVP 交付目标, 1. 项目目标

### Community 37 - "4. 数据模型"
Cohesion: 0.67
Nodes (3): 4.1 核心实体, 4.2 数据约束, 4. 数据模型

### Community 38 - "8. API 与事件契约"
Cohesion: 0.67
Nodes (3): 8.1 REST API, 8.2 实时事件, 8. API 与事件契约

## Knowledge Gaps
- **275 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `endOfLine`, `$schema` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 322 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AI 真人短剧创作平台 — Engineering Plan` connect `AI 真人短剧创作平台 — Engineering Plan` to `第一阶段开发步骤`, `1. 项目目标`, `4. 数据模型`, `8. API 与事件契约`, `3. 业务模块设计`, `11. 实施计划`, `6. AI 生成任务设计`, `2. 技术架构`, `5. Agent 设计`, `7. 质量审核设计`, `9. 桌面端工程设计`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `desktop/package.json`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _275 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06948051948051948 - nodes in this community are weakly interconnected._
- **Should `第一阶段开发步骤` be split into smaller, more focused modules?**
  _Cohesion score 0.0524390243902439 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `desktop/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
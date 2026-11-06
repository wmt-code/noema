# Graph Report - noema  (2026-11-06)

## Corpus Check
- 138 files · ~270,461 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1215 nodes · 2137 edges · 82 communities (62 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ba090ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.module.ts
- 第一阶段开发步骤
- dependencies
- dependencies
- scripts
- shared/api.ts
- project-list.tsx
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
- file.tsx
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
- AgentSettings.tsx
- health.test.mjs
- 1. 项目目标
- 4. 数据模型
- 8. API 与事件契约
- thread.aui.tsx
- cn
- dev.mjs
- chat.controller.ts
- settings-dialog.tsx
- image.tsx
- dashboard-layout.tsx
- model-selector.tsx
- .login
- AGENTS.md
- thread-list.aui.tsx
- AuthRequest
- project-details.tsx
- sheet.tsx
- attachment.aui.tsx
- button.tsx
- agent-attachments.ts
- agent-config.service.ts
- ModelCredentialService
- reasoning.tsx
- tool-group.aui.tsx
- 20261105093000_agent_configuration/migration.sql
- markdown-text.tsx
- attachment-state.ts
- Project
- scripts
- devDependencies
- server/package.json
- @earendil-works/pi-ai
- ipaddr.js
- @nestjs/common
- @nestjs/core
- @noema/shared
- @prisma/adapter-pg
- @prisma/client
- rxjs
- zod

## God Nodes (most connected - your core abstractions)
1. `cn()` - 63 edges
2. `AuthRequest` - 39 edges
3. `scripts` - 20 edges
4. `Button()` - 18 edges
5. `PrismaService` - 17 edges
6. `ModelCredentialService` - 16 edges
7. `compilerOptions` - 15 edges
8. `AgentController` - 15 edges
9. `compilerOptions` - 15 edges
10. `ProjectController` - 14 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `status()`  [INFERRED]
  apps/desktop/src/renderer/src/App.tsx → apps/server/test/agent.test.mjs
- `AttachmentPreview()` --calls--> `cn()`  [EXTRACTED]
  apps/desktop/src/renderer/src/components/assistant-ui/elements/attachment.aui.tsx → apps/desktop/src/renderer/src/lib/utils.ts
- `FileName()` --calls--> `cn()`  [EXTRACTED]
  apps/desktop/src/renderer/src/components/assistant-ui/elements/file.tsx → apps/desktop/src/renderer/src/lib/utils.ts
- `ImagePreview()` --calls--> `cn()`  [EXTRACTED]
  apps/desktop/src/renderer/src/components/assistant-ui/elements/image.tsx → apps/desktop/src/renderer/src/lib/utils.ts
- `ImageFilename()` --calls--> `cn()`  [EXTRACTED]
  apps/desktop/src/renderer/src/components/assistant-ui/elements/image.tsx → apps/desktop/src/renderer/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (82 total, 14 thin omitted)

### Community 0 - "app.module.ts"
Cohesion: 0.14
Nodes (13): Response, AuthGuard, CurrentUser, Public(), Injectable, AuthService, credentials(), derive() (+5 more)

### Community 1 - "第一阶段开发步骤"
Cohesion: 0.05
Nodes (37): Noema 桌面端, 功能, 启动, 桌面边界, 检查, Noema Server, 开发与验证, 环境与接口 (+29 more)

### Community 2 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, assistant-stream, @earendil-works/pi-agent-core, @nestjs/platform-express, reflect-metadata, @tavily/core, undici, assistant-stream (+5 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, assistant-stream, @assistant-ui/react, @assistant-ui/react-markdown, class-variance-authority, clsx, cmdk, cn (+23 more)

### Community 4 - "scripts"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, globals, description, devDependencies, eslint (+36 more)

### Community 5 - "shared/api.ts"
Cohesion: 0.06
Nodes (42): chatStream(), forgetSession(), handleRequest(), HttpError, perform(), restoreSession(), send(), serviceUrl() (+34 more)

### Community 6 - "project-list.tsx"
Cohesion: 0.11
Nodes (18): Alert(), AlertDescription(), alertVariants, Card(), CardAction(), CardContent(), CardHeader(), CardTitle() (+10 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (39): description, devDependencies, electron, electron-vite, playwright-core, tailwindcss, @tailwindcss/vite, tw-animate-css (+31 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.09
Nodes (20): Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupContent(), SidebarGroupLabel() (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError (+11 more)

### Community 10 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "App.tsx"
Cohesion: 0.11
Nodes (20): App(), Auth(), submit(), Editor, message(), AlertDialog(), AlertDialogAction(), AlertDialogCancel() (+12 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmitOnError, outDir (+8 more)

### Community 13 - "tsconfig.web.json"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, types, extends, include, DOM, ES2022 (+5 more)

### Community 14 - "database.mjs"
Cohesion: 0.12
Nodes (14): appDirectory, definition(), model, readTool(), response(), toolCall(), input, scope (+6 more)

### Community 15 - "include"
Cohesion: 0.13
Nodes (14): compilerOptions, lib, skipLibCheck, types, extends, include, DOM, ES2022 (+6 more)

### Community 16 - "src/index.ts"
Cohesion: 0.17
Nodes (20): attachmentBytes, attachmentLimit, attachmentTypes, ChatAttachment, textAttachmentBytes, validateAttachments(), EPISODE_STATUSES, EpisodeCreate (+12 more)

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

### Community 21 - "file.tsx"
Cohesion: 0.06
Nodes (50): File, FileDataKind, FileDownload(), FileDownloadProps, FileIconDisplay(), FileIconDisplayProps, FileImpl(), FileName() (+42 more)

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

### Community 34 - "AgentSettings.tsx"
Cohesion: 0.15
Nodes (13): defaults, limitFields, Field(), FieldContent(), FieldDescription(), FieldGroup(), FieldLabel(), FieldLegend() (+5 more)

### Community 36 - "1. 项目目标"
Cohesion: 0.67
Nodes (3): 1.1 核心工作流, 1.2 MVP 交付目标, 1. 项目目标

### Community 37 - "4. 数据模型"
Cohesion: 0.67
Nodes (3): 4.1 核心实体, 4.2 数据约束, 4. 数据模型

### Community 38 - "8. API 与事件契约"
Cohesion: 0.67
Nodes (3): 8.1 REST API, 8.2 实时事件, 8. API 与事件契约

### Community 40 - "thread.aui.tsx"
Cohesion: 0.06
Nodes (26): ThreadFollowupSuggestions(), AssistantMessage(), ComposerAction(), EMPTY_COMPONENTS, isNewChatView(), messageGroupBy, nextFocusable(), reasoningDuration() (+18 more)

### Community 41 - "cn"
Cohesion: 0.11
Nodes (33): BranchPicker(), answerLabels(), APPROVAL_OPTION_DEFAULT_LABELS, approvalOptionLabel(), ApprovalReceipt, formatToolDuration(), formatUnknownValue(), isAllowKind() (+25 more)

### Community 46 - "chat.controller.ts"
Cohesion: 0.12
Nodes (12): AgentConfigService, Injectable, AgentService, Injectable, entry, messageId, part, threadSelect (+4 more)

### Community 47 - "settings-dialog.tsx"
Cohesion: 0.12
Nodes (15): navigation, Props, SettingsDialog(), SettingsSection, Breadcrumb(), BreadcrumbItem(), BreadcrumbList(), BreadcrumbPage() (+7 more)

### Community 48 - "image.tsx"
Cohesion: 0.11
Nodes (26): copyImagePart(), dataUriToBlob(), defaultFilenameFromImage(), downloadImagePart(), extensionForMimeType(), Image, ImageActions(), ImageActionsProps (+18 more)

### Community 49 - "dashboard-layout.tsx"
Cohesion: 0.18
Nodes (7): Avatar(), AvatarFallback(), AvatarImage(), Separator(), SidebarInset(), DashboardLayout(), ThemeSwitcher()

### Community 50 - "model-selector.tsx"
Cohesion: 0.09
Nodes (18): ModelSelector(), types, Command(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList() (+10 more)

### Community 51 - ".login"
Cohesion: 0.24
Nodes (8): AuthController, Body, Controller, Get, HttpCode, Post, Req, Res

### Community 52 - "AGENTS.md"
Cohesion: 0.33
Nodes (5): Git 协作规范, Graphify, 前端模板使用规范, 前端组件规范, 开源功能接入

### Community 53 - "thread-list.aui.tsx"
Cohesion: 0.14
Nodes (16): dateGroupLabel(), getServerStartOfToday(), getStartOfToday(), startOfLocalDay(), subscribeToNextDay(), ThreadList(), ThreadListGroup, ThreadListItem() (+8 more)

### Community 54 - "AuthRequest"
Cohesion: 0.08
Nodes (38): readChatAttachments(), parseAgentInput(), AgentController, Body, Controller, Delete, Get, HttpCode (+30 more)

### Community 55 - "project-details.tsx"
Cohesion: 0.19
Nodes (13): Badge(), badgeVariants, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ProjectDetails() (+5 more)

### Community 56 - "sheet.tsx"
Cohesion: 0.20
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), Logistics(), LogisticsProps

### Community 57 - "attachment.aui.tsx"
Cohesion: 0.18
Nodes (11): AttachmentPreview(), AttachmentPreviewDialogProps, AttachmentPreviewProps, ComposerAddAttachment(), ComposerAttachments(), UserMessageAttachments(), TooltipIconButtonProps, Tooltip() (+3 more)

### Community 58 - "button.tsx"
Cohesion: 0.17
Nodes (10): Button(), buttonVariants, InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput() (+2 more)

### Community 59 - "agent-attachments.ts"
Cohesion: 0.47
Nodes (4): configureChatBodyParser(), AppModule, bootstrap(), Module

### Community 60 - "agent-config.service.ts"
Cohesion: 0.23
Nodes (9): agentConfigSchema, providerSchema, runInputSchema, runOutputSchema, AgentDefinition, agentLimitsSchema, AgentScope, Resource (+1 more)

### Community 61 - "ModelCredentialService"
Cohesion: 0.16
Nodes (10): credentialProviderSchema, AgentModelService, Injectable, compatibleBaseUrl(), dispatcher, gatewayFetch(), globalIPv6, publicAddress() (+2 more)

### Community 62 - "reasoning.tsx"
Cohesion: 0.14
Nodes (17): CollapsibleContent(), CollapsibleRoot, CollapsibleTrigger(), ANIMATION_DURATION, Reasoning, ReasoningGroup, ReasoningRoot, ReasoningContent() (+9 more)

### Community 63 - "tool-group.aui.tsx"
Cohesion: 0.25
Nodes (7): ToolGroup, ToolGroupComponent, ToolGroupContent(), ToolGroupRoot(), ToolGroupRootProps, ToolGroupTrigger(), toolGroupVariants

### Community 66 - "markdown-text.tsx"
Cohesion: 0.22
Nodes (7): CodeHeader(), defaultComponents, MarkdownText, MarkdownTextProps, TooltipIconButton, useCopyToClipboard(), UseCopyToClipboardOptions

### Community 67 - "attachment-state.ts"
Cohesion: 0.53
Nodes (4): AttachmentUI(), useAttachmentState(), useAttachmentSrc(), useFileSrc()

### Community 69 - "Project"
Cohesion: 0.31
Nodes (7): Episode, Project, "Asset", "Session", "User", "ChatMessage", "ChatThread"

### Community 70 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:check, db:generate, db:test, dev, start, test (+1 more)

### Community 71 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, nock, @types/node, typescript, @types/node, typescript, nock

### Community 72 - "server/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

## Knowledge Gaps
- **381 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `endOfLine`, `$schema` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 517 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `markdown-text.tsx`, `attachment-state.ts`, `thread.aui.tsx`, `image.tsx`, `file.tsx`, `thread-list.aui.tsx`, `attachment.aui.tsx`, `reasoning.tsx`, `tool-group.aui.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `status()` connect `shared/api.ts` to `database.mjs`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._
- **Should `第一阶段开发步骤` be split into smaller, more focused modules?**
  _Cohesion score 0.04734299516908213 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
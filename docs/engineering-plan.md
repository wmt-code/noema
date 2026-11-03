# AI 真人短剧创作平台 — Engineering Plan

## 1. 项目目标

构建基于 Electron 与多 Agent 的 AI 真人短剧创作平台，实现从故事创意到完整视频导出的制作流程。

### 1.1 核心工作流

故事创意 → 剧本创作 → 角色与场景设计 → 分镜生成 → 图片生成 → 视频生成 → 质量审核 → 配音与字幕 → 成片导出。

### 1.2 MVP 交付目标

完成一套可运行的 Windows 桌面应用及云端服务，支持制作并导出一集 3～5 分钟的真人 AI 短剧。

开发采用迭代交付，首先验证单镜头端到端流程，再逐步扩展至完整剧集。

## 2. 技术架构

### 2.1 技术栈

| 层级          | 技术                            |
| ------------- | ------------------------------- |
| 桌面端        | Electron + electron-vite        |
| 前端          | React + TypeScript              |
| UI            | Tailwind CSS + shadcn/ui        |
| 状态管理      | Zustand + TanStack Query        |
| 后端          | NestJS                          |
| Agent Runtime | Pi Agent Core                   |
| 数据库        | PostgreSQL + Prisma             |
| 任务队列      | BullMQ + Redis                  |
| 对象存储      | S3 兼容存储                     |
| AI 服务       | LLM、VLM、Image、Video、TTS API |
| 媒体处理      | FFmpeg / FFprobe                |
| 包管理        | pnpm Workspace                  |
| 部署          | Docker Compose                  |

### 2.2 系统架构

```text
Electron Desktop
├── Renderer
│   ├── Project Workspace
│   ├── Script Editor
│   ├── Character & Scene Editor
│   ├── Storyboard Editor
│   └── Video Editor
│
├── Main Process
│   ├── File Management
│   ├── Asset Cache
│   └── FFmpeg Export
│
└── Preload IPC
          │
          │ HTTPS / SSE
          ▼
NestJS Application
├── Project Module
├── Script Module
├── Storyboard Module
├── Asset Module
├── Agent Module
├── Generation Module
├── Review Module
└── Export Metadata Module
          │
          ├── Pi Agent Core
          ├── AI Provider Adapters
          ├── PostgreSQL
          ├── Redis / BullMQ
          └── S3 Storage

BullMQ Worker
├── Generation Submission
├── Generation Status Sync
├── Result Processing
└── Quality Evaluation
```

### 2.3 模块职责

**Desktop**

负责创作交互、素材预览、本地缓存、视频合成及导出。通过受限 Preload IPC 使用本地文件系统和 FFmpeg。

**Application Server**

负责业务规则、Agent 调用、数据持久化、任务管理、预算校验及对外 API。

**Agent Runtime**

负责自然语言交互、剧本生成、分镜设计、视觉提示词生成及质量分析。通过业务工具读写结构化内容。

**Worker**

负责执行异步任务，包括调用模型 API、同步供应商状态、处理生成结果及质量评估。

**Infrastructure**

PostgreSQL 保存业务数据及任务状态；Redis / BullMQ 负责队列调度；S3 保存媒体资源。

## 3. 业务模块设计

### 3.1 Project

- 创建、修改、删除项目。
- 管理剧集和项目元数据。
- 保存项目级制作设置。

### 3.2 Script

- 根据故事创意生成剧本。
- 支持多轮 Agent 交互修改。
- 管理剧本版本。
- 提取场次、角色和对白。

### 3.3 Character & Scene

- 创建角色设定。
- 管理角色外观、服装及参考图片。
- 创建场景设定和参考图。
- 支持跨镜头引用同一角色和场景资源。

### 3.4 Storyboard

- 将剧本转换为结构化分镜。
- 管理镜头描述、动作、对白和预期时长。
- 支持编辑、排序、删除及新增镜头。
- 关联角色、场景与参考素材。

### 3.5 Generation

- 支持图片、视频和语音生成。
- 通过统一 Provider 接口调用外部模型。
- 创建、查询和管理异步任务。
- 管理生成结果与素材版本。
- 记录生成参数、耗时与费用。

### 3.6 Review

- 检查生成文件的技术有效性。
- 使用 VLM 辅助检查画面与分镜的一致性。
- 记录审核结果及缺陷信息。
- 支持人工选择最终素材版本。

### 3.7 Editor & Export

- 按分镜顺序排列视频片段。
- 管理配音与字幕。
- 提供基础时间轴和视频预览。
- 通过本地 FFmpeg 合成并导出 MP4。

## 4. 数据模型

### 4.1 核心实体

| 实体           | 关键字段                                     |
| -------------- | -------------------------------------------- |
| Project        | id, name, settings                           |
| Episode        | id, projectId, title, status                 |
| ScriptRevision | id, episodeId, content, version              |
| Character      | id, projectId, name, description             |
| Scene          | id, episodeId, location, description, order  |
| Shot           | id, sceneId, order, duration, prompt, status |
| Asset          | id, type, storageKey, metadata               |
| GenerationTask | id, shotId, type, provider, status, cost     |
| QualityReview  | id, assetId, result, issues                  |
| ExportRecord   | id, episodeId, settings, status              |

关系：

```text
Project
├── Episode[]
│   ├── ScriptRevision[]
│   ├── Scene[]
│   │   └── Shot[]
│   └── ExportRecord[]
│
└── Character[]

Shot
├── Character[] (relation)
├── Asset[] (relation)
└── GenerationTask[]

GenerationTask
└── Asset[] (outputs)

Asset
└── QualityReview[]
```

### 4.2 数据约束

- 核心实体使用 UUID 主键。
- 数据关联通过外键约束。
- Scene、Shot 按顺序字段排序。
- ScriptRevision 保存不可变的历史版本。
- 生成素材不可被新生成结果直接覆盖。
- Shot 保存当前选用的素材引用。
- GenerationTask 保存请求参数快照、供应商任务 ID、幂等键、错误信息和费用。
- 文件内容存储于对象存储，数据库只保存引用与元数据。

## 5. Agent 设计

### 5.1 Agent 职责

| Agent            | 输入               | 输出             |
| ---------------- | ------------------ | ---------------- |
| Writer Agent     | 故事创意、已有剧本 | 结构化剧本       |
| Storyboard Agent | 剧本、角色设定     | 分镜数据         |
| Visual Agent     | 分镜、角色参考     | 图片及视频提示词 |
| Review Agent     | 分镜要求、生成素材 | 结构化质量报告   |

### 5.2 Agent 执行机制

采用 Pi Agent Core 封装独立 Agent 实例。

每个 Agent 定义：

- System Prompt。
- Model 配置。
- Tool 列表。
- 输入、输出 Schema。
- 执行限制。

Agent 通过 NestJS 暴露的业务工具操作项目数据。

结构化输出使用 Zod Schema 校验，校验失败返回明确错误，避免不合法内容进入业务数据库。

### 5.3 工作流编排

由 NestJS 维护创作流程及任务依赖。

- Agent 执行完成后保存结构化结果。
- 人工修改后的内容作为后续步骤输入。
- 重新执行某一步时，只更新其对应产物。
- 已确认的镜头素材保留，避免无关步骤重复生成。

## 6. AI 生成任务设计

### 6.1 任务状态

```text
QUEUED
   ↓
SUBMITTING
   ├── SUBMISSION_UNKNOWN
   ↓
PROCESSING
   ├── FAILED
   ↓
SUCCEEDED
```

`SUBMISSION_UNKNOWN` 表示供应商请求可能已经提交，但未拿到确定响应，需要核对远端状态。

审核状态单独由 QualityReview 和 Shot 维护。

### 6.2 任务执行流程

1. 接收生成请求。
2. 校验业务参数、镜头状态与剩余预算。
3. 创建 GenerationTask 并预留预算。
4. 将任务投递 BullMQ。
5. Worker 提交第三方 API。
6. 保存供应商任务 ID。
7. 通过 Webhook 或延迟轮询获取结果。
8. 下载结果，上传 S3。
9. 更新任务状态并结算费用。
10. 创建审核任务，通知客户端刷新。

任务创建与投递之间使用数据库待投递记录及补偿扫描，确保队列投递失败后可以恢复。

### 6.3 幂等与失败处理

- 业务请求使用唯一幂等键，防止重复创建。
- Worker 执行前检查数据库任务状态。
- 已提交的外部任务通过供应商任务 ID 查询。
- 请求结果不确定时进入核对状态，不直接重放。
- 确认尚未提交的任务允许重新调度。
- Webhook 重复到达时只进行一次终态处理。
- 本地任务取消不等同于供应商计费取消，需根据供应商能力处理。
- Worker 重启后能够恢复任务查询与后续处理。

### 6.4 成本控制

- 每镜头设置生成次数上限，默认 2 次。
- 支持项目和剧集级预算上限。
- 提交前预留预计费用，完成后记录实际费用。
- 超出预算时拒绝新的生成任务。
- 保存模型、输入参数、生成时长、实际费用及失败原因。
- 生成失败后的重新提交需要明确的业务操作，不由队列自动触发计费请求。

## 7. 质量审核设计

### 7.1 审核流程

```text
Generated Asset
      ↓
Technical Validation
      ↓
Visual Evaluation
      ↓
Quality Report
      ↓
Approve / Reject / Regenerate
```

### 7.2 技术审核

使用 FFprobe 验证：

- 文件可读取。
- 编码格式有效。
- 视频时长符合要求。
- 分辨率满足输出规格。

### 7.3 视觉审核

通过关键帧及支持的视频理解模型检查：

- 角色身份和外观一致性。
- 场景与分镜描述的一致性。
- 动作完成情况。
- 明显人物畸变和画面异常。

输出结构化缺陷类型、严重程度及说明。

审核报告作为辅助决策依据，最终素材由用户确认。

## 8. API 与事件契约

### 8.1 REST API

| 接口                                     | 用途         |
| ---------------------------------------- | ------------ |
| `POST /projects`                         | 创建项目     |
| `GET /projects/:id`                      | 获取项目详情 |
| `POST /episodes`                         | 创建剧集     |
| `POST /episodes/:id/scripts/generate`    | 生成剧本     |
| `POST /episodes/:id/storyboard/generate` | 生成分镜     |
| `PATCH /shots/:id`                       | 编辑镜头     |
| `POST /shots/:id/generations`            | 创建生成任务 |
| `GET /generations/:id`                   | 查询任务详情 |
| `POST /shots/:id/approve`                | 确认镜头素材 |

剧本、角色、场景和素材管理提供相应 CRUD 接口。

所有修改操作进行输入校验与资源归属检查。用户身份通过服务端认证确定，不信任客户端传入的所有者标识。

### 8.2 实时事件

使用 SSE 推送：

- Agent 输出增量。
- 生成任务状态变化。
- 质量审核完成。
- 素材处理完成。

SSE 断开后通过 REST 查询恢复最新状态。事件中包含资源 ID 和版本信息，避免重复事件导致客户端状态回退。

## 9. 桌面端工程设计

### 9.1 进程划分

**Renderer**

实现 React UI、编辑交互、视频预览及服务端状态管理。

**Main**

管理本地文件访问、素材下载缓存、FFmpeg 子进程以及导出任务。

**Preload**

向 Renderer 暴露明确的 IPC API，并校验输入和调用来源。

### 9.2 素材处理

- 云端生成素材保存在 S3。
- 用户选用的素材按需下载到本地缓存。
- 缓存记录与云端 Asset ID 关联。
- 文件不存在或校验失败时重新下载。
- 导出时检查所需素材是否完整。
- 项目业务数据以服务端为准，本地保存编辑草稿和媒体缓存。

### 9.3 安全要求

- Electron 启用 Context Isolation 和 Sandbox。
- Renderer 不直接访问 Node.js 或任意系统命令。
- API 密钥只保存在服务端。
- 本地文件路径经校验后传递给 FFmpeg。
- 对服务端请求进行认证和访问控制。

## 10. 项目结构

```text
ai-drama/
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       ├── main/
│   │       ├── preload/
│   │       └── renderer/
│   │
│   ├── server/
│   │   └── src/
│   │       ├── modules/
│   │       ├── agents/
│   │       ├── providers/
│   │       └── common/
│   │
│   └── worker/
│       └── src/
│           ├── processors/
│           └── jobs/
│
├── packages/
│   └── shared/
│       ├── schemas/
│       └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── infra/
│   └── compose.yaml
│
├── pnpm-workspace.yaml
└── package.json
```

使用共享 Schema 约束前后端数据契约。server 与 worker 复用业务类型和 Provider 接口，避免重复实现。

## 11. 实施计划

### Phase 1 — 工程基础与项目管理

**任务**

1. 初始化 pnpm Monorepo。
2. 搭建 Electron、React、NestJS。
3. 配置 ESLint、Prettier、TypeScript。
4. 配置 PostgreSQL、Redis、Prisma。
5. 建立核心数据模型及迁移。
6. 完成基础认证与项目管理 API。
7. 实现桌面工作台布局和项目管理页面。

**交付物**

可运行的桌面应用与后端，支持创建项目和剧集，并持久化数据。

### Phase 2 — Agent 创作与分镜

**任务**

1. 集成 Pi Agent Core。
2. 实现 Agent 配置与调用接口。
3. 实现剧本生成与编辑。
4. 实现角色及场景管理。
5. 实现结构化分镜生成。
6. 完成分镜卡片编辑、排序及保存。

**交付物**

用户能够从故事创意生成可编辑剧本和完整分镜，并保存角色参考信息。

### Phase 3 — AI 媒体生成

**任务**

1. 实现 AI Provider 接口。
2. 接入图片生成 API。
3. 接入视频生成 API。
4. 实现 BullMQ 任务队列与 Worker。
5. 实现任务持久化、状态查询和恢复。
6. 实现素材上传及版本管理。
7. 实现生成预算及次数限制。

**交付物**

用户能够生成首帧图片和镜头视频，查看任务结果，并替换镜头素材。

### Phase 4 — 质量审核与成片

**任务**

1. 接入 FFprobe 技术审核。
2. 接入 VLM 视觉审核。
3. 实现审核结果及人工确认。
4. 接入语音生成。
5. 实现分镜序列、字幕和预览。
6. 集成本地 FFmpeg。
7. 实现 MP4 导出。

**交付物**

用户能够审核镜头、完成配音及字幕，并导出完整短剧。

### Phase 5 — 集成测试与交付

**任务**

1. 进行完整业务链路测试。
2. 验证长时间生成任务恢复。
3. 验证重复提交与重复回调处理。
4. 验证预算限制及费用记录。
5. 验证素材下载失败与缓存恢复。
6. 验证桌面应用重启后的数据恢复。
7. 完成 Windows 安装包构建与测试。

**交付物**

可安装、可运行、通过 MVP 验收的桌面应用。

## 12. 测试与工程质量

### 12.1 测试策略

**单元测试**

覆盖预算校验、任务状态流转、结构化数据校验、分镜排序及费用计算。

**集成测试**

使用测试数据库、Redis 和 Mock Provider，验证任务提交、异步状态同步、Webhook 幂等、素材入库及失败恢复。

**端到端测试**

验证从项目创建、剧本生成、分镜生成、视频审核到 MP4 导出的完整流程。

### 12.2 工程要求

- 所有数据库变更通过 Prisma Migration 管理。
- API 请求和响应使用明确的 Schema。
- 外部模型 API 统一封装，业务模块不直接依赖具体供应商 SDK。
- 日志包含 requestId、taskId 等关联标识。
- 外部服务超时、限流及错误需要保留可诊断信息。
- 关键业务状态变化应有自动化测试。
- CI 执行类型检查、Lint、测试及构建。
- 不以 Mock Provider 测试通过代替真实供应商联调。

## 13. MVP 验收标准

| 验收项   | 通过条件                       |
| -------- | ------------------------------ |
| 桌面应用 | Windows 安装包可正常启动       |
| 项目管理 | 项目与剧集数据重启后保留       |
| 剧本创作 | 能生成并人工修改结构化剧本     |
| 角色管理 | 可保存及复用角色参考图         |
| 分镜管理 | 可编辑、排序、保存分镜         |
| 图片生成 | 可生成并选择首帧               |
| 视频生成 | 可异步生成并查看结果           |
| 异常恢复 | 重启 Worker 后可恢复未完成任务 |
| 质量审核 | 可查看质量报告并确认素材       |
| 成本控制 | 达到预算或次数上限时阻止新任务 |
| 成片制作 | 可合成视频、语音及字幕         |
| 视频导出 | 可导出正常播放的 MP4           |

最终使用真实模型 API 完成一集 3～5 分钟真人 AI 短剧的制作与导出，并记录完整的生成费用和任务执行情况。

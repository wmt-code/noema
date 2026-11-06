# 模型与 Agent 设置

工单 #4 提供桌面设置入口、按用户隔离的模型密钥、按项目保存的 Agent 配置，以及项目和剧集调用接口。剧集沿用所属项目配置，调用只返回 `{ "text": "回答内容" }`；剧本结构和版本保存由 #5 实现。

## 桌面操作

在侧栏打开“模型设置 → 账号密钥”，选择 OpenAI 或 Anthropic 后可保存、替换或删除当前账号的 API 密钥。第三方网关请选择「OpenAI 兼容服务」，填入服务商的 Base URL 和专用 API 密钥，点「保存连接」。Base URL 使用公网 HTTPS 地址，例如 `https://gateway.example/v1`，保留服务商的路径前缀。客户端自动追加 `/chat/completions`。更换网关地址时需重新输入对应密钥，重新打开设置时只回显已保存的地址和配置状态。

在项目操作菜单打开“项目模型设置”，或在模型设置中切换到“项目模型”。可按名称或编号搜索模型，设置系统提示词、只读上下文工具和执行限制，然后点击“保存模型配置”。使用兼容网关时，在模型下拉列表选「OpenAI 兼容服务」，填写服务商提供的完整「模型 ID」，每个项目可使用不同 ID。网关需支持流式 Chat Completions。官方模型目录来自锁定版本的 Pi，实际访问权限取决于供应商账号。

从左侧菜单打开「对话」。选择项目即可使用该项目的模型，也可选择「独立对话」并在「对话模型」保存账号级配置。选择剧集后，新会话使用该剧集的上下文。左侧可新建、搜索、重命名和重新打开会话。

消息及附件随会话保存在 PostgreSQL。追问使用当前分支最近 24 条消息，并按上下文预算裁剪。同一项目的其他会话自动提供最近及与当前问题匹配的文字摘录，每类最多 8 条，每条最多 700 字。独立对话仅使用本会话的历史。

在「对话模型」可切换流式显示和思考级别。内置模型使用 Pi 返回的可选级别。兼容网关的推理强度依赖供应商支持，默认关闭。聊天可上传 TXT、MD、CSV、JSON、PNG、JPEG 和 WebP，每条最多 3 个文件，总计 2 MiB，其中文本文档共 64 KiB。图片需要支持视觉输入的模型。

会话、会话列表、附件、Markdown 和思考折叠组件直接取自 [assistant-ui 官方源码](https://github.com/assistant-ui/assistant-ui/tree/3a61e1df350c02fd38c460f3f186f324bd907d9e/packages/ui/src/components/react/assistant-ui/elements)。桌面端通过官方 LocalRuntime、RemoteThreadListAdapter 和 ThreadHistoryAdapter 对接 Noema 登录与数据库，服务端将 Pi 的事件交给 assistant-stream 编码。MIT 许可随桌面端分发。设置面板和模型选择器来自 [shadcn/ui](https://github.com/shadcn-ui/ui/tree/8a3536678a528cc012b9e62484290e79d0be410f)。

## API

所有接口要求现有 Bearer 会话。项目与剧集操作检查资源归属；不存在或属于其他用户时返回 404。

| 方法                 | 路径                           | 请求 / 响应                                                             |
| -------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| GET                  | `/agent-models`                | 模型数组，字段为 `provider`、`id`、`name`                               |
| GET                  | `/model-credentials`           | 当前用户已配置的供应商、`baseUrl` 和 `updatedAt`，不返回密钥或密文      |
| PUT                  | `/model-credentials/:provider` | `{ "apiKey": "..." }`，兼容服务另传 `baseUrl`，成功 204                 |
| DELETE               | `/model-credentials/:provider` | 删除当前用户密钥，成功 204                                              |
| GET / PUT            | `/chat-config`                 | 账号的独立对话配置                                                      |
| GET / POST           | `/chats`                       | 查询或创建当前账号的会话                                                |
| GET / PATCH / DELETE | `/chats/:id`                   | 读取、修改、删除会话                                                    |
| GET / POST           | `/chats/:id/messages`          | 加载或幂等保存会话消息                                                  |
| POST                 | `/chats/:id/stream`            | assistant-ui 流式回复                                                   |
| GET                  | `/projects/:id/agent-config`   | `{ "config": null }` 或 `{ "config": 配置 }`                            |
| PUT                  | `/projects/:id/agent-config`   | 完整替换配置，返回保存后的配置                                          |
| POST                 | `/projects/:id/agent-runs`     | `{ "prompt": "..." }`，可选 `attachments`，成功返回 `{ "text": "..." }` |
| POST                 | `/episodes/:id/agent-runs`     | 同上，使用所属项目配置和当前剧集上下文                                  |

配置示例：

```json
{
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "systemPrompt": "你是一位创作助手，请用中文回答。",
  "tools": ["read_context"],
  "limits": {
    "timeoutMs": 60000,
    "maxTurns": 4,
    "maxToolCalls": 8,
    "maxTokens": 4096,
    "maxResponseBytes": 131072
  }
}
```

`tools` 和 `limits` 可省略，分别默认为无工具和运行基础的默认限制。只允许 `read_context`，工具不接受参数，每次执行重新检查归属，只返回当前项目名称或当前剧集及所属项目名称，不读取配置、密钥或其他项目。请求中的额外字段、任意工具、项目配置中的供应商地址和未知官方模型均被拒绝。兼容网关的地址仅随对应账号密钥保存。

参数错误返回 400，未配置项目返回 409，缺少密钥或密钥存储不可用返回 503，缺少密钥时界面可直接打开对应供应商设置；模型、工具或输出校验失败返回 502，超时返回 504。客户端断开时取消当前执行，模型原始错误不回传。

## 存储与部署

先执行 `corepack pnpm db:deploy`，创建 `AgentConfig` 和 `ModelCredential` 表并添加可选网关地址字段；项目配置随项目删除级联清理。密钥使用 AES-256-GCM 加密，以用户和供应商作为认证附加数据，兼容服务还绑定网关地址，密文无法跨用户或供应商直接替换使用。

服务端首次保存密钥时自动生成 32 字节加密主密钥，默认保存到仓库根目录 `.data/credential.key`，该目录已被 Git 忽略。可通过 `NOEMA_DATA_DIR` 指定服务端持久化目录；这只是存储路径，不是模型密钥。部署和备份时应保护并保留此目录，与数据库分开控制访问权限；已有密文但主密钥丢失时会拒绝操作，不静默重建。当前面向单服务实例，多实例部署需共享同一受保护主密钥文件。

## 验证

- `corepack pnpm check`、`corepack pnpm test`、`corepack pnpm build`。
- `corepack pnpm db:test`：覆盖迁移、配置校验、身份与归属、密钥替换/删除/重载、密文损坏、项目/剧集调用、只读工具、失败脱敏及超时。测试使用真实 Pi 和 OpenAI 适配器，以受控 HTTP 流替代外部模型响应。
- `corepack pnpm --filter @noema/desktop smoke:agents` 在真实 Electron 窗口验证配置、附件、增量回复、会话恢复、项目记忆及窄屏布局。

自动测试使用虚拟密钥，不调用外部模型，也不产生供应商费用。

# Agent 运行基础

工单 #3 在 NestJS 中提供 `AgentService.run(scope, definition, input, signal?)`，每次调用创建独立 Pi Agent，返回经过 Zod 校验的结构化结果。工单 #4 的配置管理和 HTTP 调用接口见[模型与 Agent 设置](./agent-settings.md)，剧本生成与版本保存属于 #5。

## 调用约定

- `scope.user` 必须来自现有 `AuthGuard` / `CurrentUser`，不能从请求正文读取用户身份。`resource` 和 `resourceId` 交给 `OwnershipService.assertOwned` 检查；检查失败时不会调用模型。
- `definition` 是服务端可信配置，包含系统提示词、Pi `Model`、`StreamFn`、Zod 输入/输出 Schema、提示词函数及可选工具和执行限制。模型适配器可以使用 Pi `Models.streamSimple.bind(models)`；不得允许客户端传入执行函数或任意工具。
- 输入先通过 Schema，再生成提示词；提示词最多 64 KiB。结构化任务要求完整 JSON 并校验输出 Schema。交互聊天使用文本输出模式，校验非空内容后由服务端封装为 `{ text }`。业务 Schema 应使用 `z.strictObject` 并限制字符串、数组长度，不接受 Markdown 代码围栏或截断结果。
- 工具仅用于读取上下文，必须按当前用户和资源限定范围，并遵守传入的 `AbortSignal`。业务写入放在 `await run(...)` 成功之后，由业务服务再次检查归属并在事务内完成；工具中不得提前保存生成内容。
- 不复用 Agent 会话或消息队列，不自动重试失败调用，不记录提示词、模型原始错误和密钥。

## 执行限制

| 参数               | 默认值  | 允许范围                                   |
| ------------------ | ------- | ------------------------------------------ |
| `timeoutMs`        | 60 秒   | 1–300000 毫秒                              |
| `maxTurns`         | 4       | 1–20 次模型请求                            |
| `maxToolCalls`     | 8       | 0–50 次工具执行                            |
| `maxTokens`        | 4096    | 1–32768，每次请求同时取模型上限的较小值    |
| `maxResponseBytes` | 128 KiB | 1–1048576 字节，每轮内容包含推理和工具参数 |

超时返回 504，外部取消返回 503；模型、工具、执行上限或输出校验失败返回 502，输入失败返回 400。权限错误保持现有 401/404 语义。模型错误不会原样向调用方暴露。

超时或取消会终止等待并向 Pi 和工具发送取消信号。不遵守取消信号的第三方异步函数无法被 JavaScript 强制杀死，因此工具必须可取消且无写入副作用；本服务不提供进程级隔离。模型 Token 上限通过适配器传递，响应字节上限在流事件和最终消息上检查。

## 依赖与验证

使用 [Pi 官方运行库](https://github.com/earendil-works/pi/tree/main/packages/agent) `@earendil-works/pi-agent-core` 和 `@earendil-works/pi-ai`，均锁定 1.5.0。旧 `@mariozechner` 包已标记弃用。Zod 锁定 4.6.7。

Pi 间接依赖的 Google SDK 类型引用未安装的可选 MCP SDK 和浏览器全局类型；服务端开启 `skipLibCheck` 跳过第三方声明文件检查，项目源码仍保持 `strict` 检查。`@google/genai` 的空安装脚本和 `protobufjs` 的版本提示脚本明确禁止执行，安装时不放开其他依赖脚本。

- `corepack pnpm --filter @noema/server test`：真实 Pi 循环搭配可控响应，检查实例隔离、工具执行、输入输出校验、截断/异常输出、调用上限、超时和取消。
- `corepack pnpm db:test`：使用隔离的 PostgreSQL Schema，经现有注册登录获取身份，检查 NestJS 注入、跨用户拦截、有效结果保存，以及非法结果不会产生剧本版本。
- 测试不访问外部模型，不产生模型费用；#4 已通过实际 Pi 模型适配器和受控 HTTP 流验证调用接口，真实供应商调用需在设置中配置有效密钥。

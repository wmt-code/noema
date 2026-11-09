import { useEffect, useRef, useState, type FormEvent } from 'react'
import type {
  AgentConfig,
  AgentModel,
  AgentProvider,
  ModelCredential
} from '../../shared/api'
import { request } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldDescription
} from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem
} from '@/components/ui/select'

import { Switch } from '@/components/ui/switch'
import { SettingsDialog, type SettingsSection } from './agent/settings-dialog'
import { ModelSelector } from './agent/model-selector'
const defaults: AgentConfig = {
  provider: 'openai',
  thinkingLevel: 'off',
  streaming: true,
  model: '',
  systemPrompt: '你是一位创作助手，请用中文回答。',
  tools: [],
  limits: {
    timeoutMs: 60000,
    maxTurns: 4,
    maxToolCalls: 8,
    maxTokens: 4096,
    maxResponseBytes: 131072
  }
}
const limitFields = [
  ['timeoutMs', '超时（毫秒）', 1, 300000],
  ['maxTurns', '最多模型请求次数', 1, 20],
  ['maxToolCalls', '最多工具调用次数', 0, 50],
  ['maxTokens', '单次输出 Token 上限', 1, 32768],
  ['maxResponseBytes', '单轮响应字节上限', 1, 1048576]
] as const

export function AgentSettings({
  projectId,
  projectName,
  section: initialSection,
  initialProvider,
  onClose,
  onError
}: {
  projectId: string | null
  projectName?: string
  section: SettingsSection
  initialProvider?: AgentProvider
  onClose: () => void
  onError: (error: unknown) => string
}) {
  const [section, setSection] = useState(initialSection)
  const [selectedProvider, setKeyProvider] = useState<
    ModelCredential['provider'] | null
  >(initialProvider ?? null)
  const [urlDraft, setUrlDraft] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<AgentModel[]>([])
  const [credentials, setCredentials] = useState<ModelCredential[]>([])
  const [config, setConfig] = useState<AgentConfig>(defaults)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const loadedConfig = useRef<string | null>(null)
  useEffect(() => {
    let active = true
    async function load() {
      if (section === 'keys') {
        const [items, saved] = await Promise.all([
          request<ModelCredential[]>({ type: 'credentials:list' }),
          projectId
            ? request<AgentConfig | null>({
                type: 'agent:config',
                projectId
              }).catch(() => null)
            : null
        ])
        if (active) {
          setCredentials(items)
          if (saved) setKeyProvider((current) => current ?? saved.provider)
        }
      } else if (loadedConfig.current !== (projectId ?? 'personal')) {
        const [catalog, saved] = await Promise.all([
          request<AgentModel[]>({ type: 'models:list' }),
          request<AgentConfig | null>({ type: 'agent:config', projectId })
        ])
        if (active) {
          const defaultModel =
            catalog.find((item) => item.provider === defaults.provider) ??
            catalog[0]
          loadedConfig.current = projectId ?? 'personal'
          setModels(catalog)
          setConfig(
            saved ?? {
              ...defaults,
              provider: defaultModel?.provider ?? defaults.provider,
              model: defaultModel?.id ?? ''
            }
          )
        }
      }
    }
    void load()
      .catch((error) => {
        if (active) {
          setLoadFailed(true)
          setError(onError(error))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, section, reload, onError])
  function resetStatus() {
    setUrlDraft(null)
    setLoading(true)
    setLoadFailed(false)
    setError('')
    setNotice('')
    setApiKey('')
  }
  async function action(run: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await run()
    } catch (error) {
      setError(onError(error))
    } finally {
      setBusy(false)
    }
  }
  function saveKey(event: FormEvent) {
    event.preventDefault()
    void action(async () => {
      await request({
        type: 'credentials:save',
        provider: keyProvider,
        ...(compatible ? { baseUrl } : {}),
        apiKey
      })
      setApiKey('')
      setCredentials((items) => [
        ...items.filter((item) => item.provider !== keyProvider),
        {
          provider: keyProvider,
          baseUrl: compatible ? baseUrl : null,
          updatedAt: new Date().toISOString()
        }
      ])
      setUrlDraft(null)
      setNotice(
        compatible
          ? '连接已保存。在项目模型中选择「OpenAI 兼容服务」并填写模型 ID。'
          : '密钥已保存。'
      )
    })
  }
  const keyProvider =
    selectedProvider ??
    (credentials.length === 1 ? credentials[0]?.provider : undefined) ??
    'openai'
  const credential = credentials.find((item) => item.provider === keyProvider)
  const configured = Boolean(credential)
  const compatible = keyProvider === 'openai-compatible'
  const baseUrl = (urlDraft ?? credential?.baseUrl ?? '').trim()
  function setTool(tool: AgentConfig['tools'][number], enabled: boolean) {
    setConfig((current) => ({
      ...current,
      tools: enabled
        ? [...current.tools, tool]
        : current.tools.filter((item) => item !== tool)
    }))
  }

  return (
    <SettingsDialog
      section={section}
      hasProject={!!projectId}
      busy={busy}
      onSection={(next) => {
        if (section !== next) {
          resetStatus()
          setSection(next)
        }
      }}
      onClose={onClose}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription role="status">{notice}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <Spinner aria-label="正在加载设置" />
      ) : loadFailed ? (
        <Button
          variant="outline"
          onClick={() => {
            resetStatus()
            setReload((n) => n + 1)
          }}
        >
          重试
        </Button>
      ) : section === 'keys' ? (
        <form onSubmit={saveKey}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="agent-provider">服务商</FieldLabel>
              <Select
                value={keyProvider}
                onValueChange={(v: ModelCredential['provider']) => {
                  setKeyProvider(v)
                  setUrlDraft(null)
                  setApiKey('')
                  setNotice('')
                  setError('')
                }}
                disabled={busy}
              >
                <SelectTrigger id="agent-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="openai-compatible">
                      OpenAI 兼容服务
                    </SelectItem>
                    <SelectItem value="tavily">Tavily 联网搜索</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {compatible && (
              <Field>
                <FieldLabel htmlFor="gateway-url">Base URL</FieldLabel>
                <Input
                  id="gateway-url"
                  type="url"
                  required
                  maxLength={2048}
                  disabled={busy}
                  value={urlDraft ?? credential?.baseUrl ?? ''}
                  onChange={(event) => setUrlDraft(event.target.value)}
                  placeholder="https://api.example.com/v1"
                />
                <FieldDescription>
                  填写服务商提供的 HTTPS 接口根地址，保留版本路径，省略
                  /chat/completions。
                </FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="model-api-key">
                API 密钥{' '}
                <Badge variant="secondary">
                  {configured ? '已配置' : '未配置'}
                </Badge>
              </FieldLabel>
              <Input
                id="model-api-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                maxLength={4096}
                required
                disabled={busy}
                placeholder={configured ? '输入新密钥以替换' : '输入 API 密钥'}
              />
              <FieldDescription>
                密钥在服务端加密保存，不写入桌面端本地存储。
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Button
                type="submit"
                disabled={busy || !apiKey.trim() || (compatible && !baseUrl)}
              >
                {compatible ? '保存连接' : '保存密钥'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !configured}
                onClick={() =>
                  void action(async () => {
                    await request({
                      type: 'credentials:delete',
                      provider: keyProvider
                    })
                    setCredentials((items) =>
                      items.filter((item) => item.provider !== keyProvider)
                    )
                    setApiKey('')
                    setUrlDraft(null)
                    setNotice('密钥已删除。')
                  })
                }
              >
                删除密钥
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : (
        <>
          <p className="wrap-anywhere text-sm text-muted-foreground">
            {projectName
              ? projectName + ' · 项目与剧集对话模型'
              : '独立对话模型'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void action(async () => {
                const saved = await request<AgentConfig>({
                  type: 'agent:save',
                  projectId,
                  config
                })
                setConfig(saved)
                setNotice('模型配置已保存。')
              })
            }}
          >
            <FieldGroup>
              <Field>
                <ModelSelector
                  models={models}
                  disabled={busy}
                  value={{ provider: config.provider, id: config.model }}
                  onSelect={(model) =>
                    setConfig((current) => ({
                      ...current,
                      provider: model.provider,
                      thinkingLevel: 'off',
                      model: model.id
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="stream-output">流式输出</FieldLabel>
                <Switch
                  id="stream-output"
                  checked={config.streaming}
                  onCheckedChange={(streaming) =>
                    setConfig({ ...config, streaming })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="thinking-level">思考模式</FieldLabel>
                <Select
                  value={config.thinkingLevel}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      thinkingLevel: value as AgentConfig['thinkingLevel']
                    })
                  }
                >
                  <SelectTrigger id="thinking-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(config.provider === 'openai-compatible'
                      ? (['off', 'low', 'medium', 'high'] as const)
                      : (models.find(
                          (m) =>
                            m.provider === config.provider &&
                            m.id === config.model
                        )?.thinkingLevels ?? (['off'] as const))
                    ).map((level) => (
                      <SelectItem value={level} key={level}>
                        {
                          {
                            off: '关闭',
                            minimal: '最低',
                            low: '低',
                            medium: '中',
                            high: '高',
                            xhigh: '很高',
                            max: '最高'
                          }[level]
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.provider === 'openai-compatible' && (
                  <FieldDescription>
                    启用前请确认该模型支持推理强度参数。
                  </FieldDescription>
                )}
              </Field>
              {config.provider === 'openai-compatible' && (
                <Field>
                  <FieldLabel htmlFor="gateway-model">模型 ID</FieldLabel>
                  <Input
                    id="gateway-model"
                    value={config.model}
                    required
                    maxLength={150}
                    disabled={busy}
                    placeholder="服务商提供的模型 ID"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        model: event.target.value
                      }))
                    }
                  />
                  <FieldDescription>
                    按服务商列出的完整 ID
                    填写，项目和剧集将使用账号密钥中保存的兼容服务。
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="agent-system">系统提示词</FieldLabel>
                <Textarea
                  id="agent-system"
                  value={config.systemPrompt}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      systemPrompt: event.target.value
                    }))
                  }
                  required
                  maxLength={16000}
                  disabled={busy}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="agent-tools">
                    读取项目或剧集上下文
                  </FieldLabel>
                  <FieldDescription>
                    允许模型读取当前项目或剧集的名称和编号。
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="agent-tools"
                  checked={config.tools.includes('read_context')}
                  disabled={busy}
                  onCheckedChange={(enabled) =>
                    setTool('read_context', enabled)
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="agent-web-search">联网搜索</FieldLabel>
                  <FieldDescription>
                    DeepSeek
                    官方连接使用模型密钥搜索。其他支持工具调用的模型共用账号的搜索服务，优先使用已配置的
                    Tavily，其次使用 DeepSeek。
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="agent-web-search"
                  checked={config.tools.includes('web_search')}
                  disabled={busy}
                  onCheckedChange={(enabled) => setTool('web_search', enabled)}
                />
              </Field>
              <FieldSet>
                <FieldLegend>执行限制</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {limitFields.map(([key, label, min, max]) => (
                    <Field key={key}>
                      <FieldLabel htmlFor={`agent-${key}`}>{label}</FieldLabel>
                      <Input
                        id={`agent-${key}`}
                        type="number"
                        min={min}
                        max={max}
                        step={1}
                        required
                        disabled={busy}
                        value={config.limits[key]}
                        onChange={(event) =>
                          setConfig((value) => ({
                            ...value,
                            limits: {
                              ...value.limits,
                              [key]: Number(event.target.value)
                            }
                          }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              </FieldSet>
              <Button
                type="submit"
                disabled={
                  busy || !config.model.trim() || !config.systemPrompt.trim()
                }
              >
                保存模型配置
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </SettingsDialog>
  )
}

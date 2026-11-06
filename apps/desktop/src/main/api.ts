import { randomUUID } from 'node:crypto'
import { app, safeStorage, shell } from 'electron'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  parseEpisodeCreate,
  parseEpisodePatch,
  parseProjectCreate,
  parseProjectPatch,
  validateAttachments,
  ValidationError
} from '@noema/shared'
import type { ApiRequest, ApiResponse, AgentProvider } from '../shared/api'

let token: string | undefined
const sessionFile = () => join(app.getPath('userData'), 'session.bin')
const tokenPattern = /^[A-Za-z0-9_-]{43}$/

function serviceUrl(): string {
  const url = new URL(process.env.NOEMA_API_URL ?? 'http://127.0.0.1:3000')
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))
  )
    throw new Error(
      'NOEMA_API_URL must be an HTTPS origin or a loopback HTTP origin'
    )
  return url.origin
}

export async function restoreSession(): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) return
  try {
    const saved = JSON.parse(
      safeStorage.decryptString(await readFile(sessionFile()))
    ) as { token?: unknown; origin?: unknown }
    if (
      saved.origin === serviceUrl() &&
      typeof saved.token === 'string' &&
      tokenPattern.test(saved.token)
    ) {
      token = saved.token
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('Unable to restore session')
  }
}

async function forgetSession(): Promise<void> {
  token = undefined
  await rm(sessionFile(), { force: true })
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public missingProvider?: AgentProvider
  ) {
    super(message)
  }
}

async function send(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 15000
): Promise<unknown> {
  const response = await fetch(`${serviceUrl()}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error'
  })
  if (response.status === 401) await forgetSession()
  if (!response.ok) {
    if (response.status === 503 && path.endsWith('/agent-runs')) {
      const body = await response.json().catch(() => null)
      if (
        body?.code === 'MISSING_MODEL_CREDENTIAL' &&
        body.provider === 'tavily'
      )
        throw new HttpError(
          503,
          '请在模型设置的账号密钥中保存 Tavily 密钥，或关闭联网搜索。'
        )
      const names = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        'openai-compatible': 'OpenAI 兼容服务'
      }
      if (
        body?.code === 'MISSING_MODEL_CREDENTIAL' &&
        Object.hasOwn(names, body.provider)
      ) {
        const provider = body.provider as AgentProvider
        const fields =
          provider === 'openai-compatible' ? 'Base URL 和 API 密钥' : 'API 密钥'
        throw new HttpError(
          503,
          '此项目使用「' +
            names[provider] +
            '」，请先保存该服务的 ' +
            fields +
            '。',
          provider
        )
      }
    }
    const messages: Record<number, string> = {
      400:
        path === '/model-credentials/openai-compatible'
          ? '请检查密钥和 Base URL。请使用公网 HTTPS 根地址，省略查询参数和 /chat/completions。'
          : '请检查填写内容。',
      401:
        path === '/auth/login'
          ? '邮箱或密码不正确。'
          : '登录已过期，请重新登录。',
      404: '项目或剧集已不存在，请刷新列表。',
      409:
        path === '/auth/register'
          ? '该邮箱已注册，请直接登录。'
          : '请先保存项目的 Agent 配置。',
      413: '附件内容超过请求上限。',
      422: '当前模型不支持图片，请选用视觉模型或发送文本文件。',
      502: '模型未能完成回复，请检查服务商地址、模型 ID 及其支持的输入类型。',
      503: '模型暂不可用，请在设置中配置密钥，或检查服务端密钥存储。',
      504: '模型调用超时，请稍后重试或调整执行限制。',
      429: '操作过于频繁，请稍后重试。'
    }
    throw new HttpError(
      response.status,
      messages[response.status] ?? '服务暂时不可用，请稍后重试。'
    )
  }
  return response.status === 204 ? null : response.json()
}

function id(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ValidationError('Invalid id')
  }
  return value
}

const streamTickets = new Map<
  string,
  { id: string; session: string; expires: number }
>()
// Opaque local desktop transport. Only this authenticated chat route is exposed to the renderer.
export async function chatStream(request: Request, expectedOrigin: string) {
  const url = new URL(request.url)
  const route = /^\/chats\/([0-9a-f-]{36})\/stream$/.exec(url.pathname)
  const origin = request.headers.get('origin')
  if (
    url.hostname !== 'api' ||
    !route ||
    (origin && !['null', 'file://', expectedOrigin].includes(origin)) ||
    !token
  )
    return new Response(null, { status: 403 })
  const cors = {
    'access-control-allow-origin': origin ?? 'null',
    'access-control-allow-methods': 'POST',
    'access-control-allow-headers': 'content-type,x-noema-stream'
  }
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  const key = request.headers.get('x-noema-stream') ?? ''
  const ticket = streamTickets.get(key)
  streamTickets.delete(key)
  if (
    !ticket ||
    ticket.session !== token ||
    ticket.id !== route[1] ||
    ticket.expires < Date.now()
  )
    return new Response(null, { status: 403, headers: cors })
  const response = await fetch(
    serviceUrl() + '/chats/' + id(route[1]) + '/stream',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json'
      },
      body: await request.arrayBuffer(),
      signal: request.signal,
      redirect: 'error'
    }
  )
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...cors,
      'content-type':
        response.headers.get('content-type') ?? 'application/octet-stream'
    }
  })
}

async function perform(request: ApiRequest): Promise<unknown> {
  switch (request.type) {
    case 'chats:open-source': {
      const url =
        typeof request.url === 'string' ? URL.parse(request.url) : null
      if (
        !url ||
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new ValidationError('Invalid source URL')
      return shell.openExternal(url.href)
    }
    case 'chats:stream-ticket': {
      if (!token) throw new HttpError(401, '请重新登录。')
      for (const [key, ticket] of streamTickets)
        if (ticket.expires < Date.now()) streamTickets.delete(key)
      const key = randomUUID()
      streamTickets.set(key, {
        id: id(request.id),
        session: token,
        expires: Date.now() + 30_000
      })
      return key
    }
    case 'chats:list':
      return send(
        'GET',
        '/chats' +
          (request.projectId ? '?project=' + id(request.projectId) : '')
      )
    case 'chats:create':
      return send('POST', '/chats', {
        projectId: request.projectId && id(request.projectId),
        episodeId: request.episodeId && id(request.episodeId)
      })
    case 'chats:get':
      return send('GET', '/chats/' + id(request.id))
    case 'chats:history':
      return send('GET', '/chats/' + id(request.id) + '/messages')
    case 'chats:append':
      return send(
        'POST',
        '/chats/' + id(request.id) + '/messages',
        request.item
      )
    case 'chats:update':
      return send('PATCH', '/chats/' + id(request.id), request.data)
    case 'chats:delete':
      return send('DELETE', '/chats/' + id(request.id))
    case 'models:list':
      return send('GET', '/agent-models')
    case 'credentials:list':
      return send('GET', '/model-credentials')
    case 'credentials:save':
    case 'credentials:delete': {
      if (
        !['openai', 'anthropic', 'openai-compatible', 'tavily'].includes(
          request.provider
        )
      )
        throw new ValidationError('Invalid provider')
      if (request.type === 'credentials:delete')
        return send('DELETE', `/model-credentials/${request.provider}`)
      if (
        typeof request.apiKey !== 'string' ||
        !/^[\x21-\x7e]{1,4096}$/.test(request.apiKey.trim())
      )
        throw new ValidationError('Invalid API key')
      return send('PUT', `/model-credentials/${request.provider}`, {
        apiKey: request.apiKey.trim(),
        ...(request.provider === 'openai-compatible'
          ? { baseUrl: request.baseUrl }
          : {})
      })
    }
    case 'agent:config':
      return (
        (await send(
          'GET',
          request.projectId
            ? `/projects/${id(request.projectId)}/agent-config`
            : '/chat-config'
        )) as { config: unknown }
      ).config
    case 'agent:save':
      return send(
        'PUT',
        request.projectId
          ? `/projects/${id(request.projectId)}/agent-config`
          : '/chat-config',
        request.config
      )
    case 'agent:run': {
      const attachments = validateAttachments(request.attachments)
      if (
        !['projects', 'episodes'].includes(request.resource) ||
        typeof request.prompt !== 'string' ||
        (!request.prompt.trim() && !attachments.length) ||
        request.prompt.length > 16000
      )
        throw new ValidationError('Invalid agent input')
      return send(
        'POST',
        `/${request.resource}/${id(request.id)}/agent-runs`,
        { prompt: request.prompt, attachments },
        315000
      )
    }
    case 'session':
      return token ? send('GET', '/auth/me') : null
    case 'register':
    case 'login': {
      if (
        typeof request.email !== 'string' ||
        typeof request.password !== 'string' ||
        request.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim()) ||
        request.password.length < 12 ||
        Buffer.byteLength(request.password, 'utf8') > 128
      )
        throw new HttpError(
          400,
          '请使用有效邮箱，密码至少 12 个字符且不超过 128 字节。'
        )
      const credentials = { email: request.email, password: request.password }
      if (request.type === 'register')
        await send('POST', '/auth/register', credentials)
      const result = (await send('POST', '/auth/login', credentials)) as {
        accessToken: string
        user: unknown
      }
      if (!tokenPattern.test(result.accessToken))
        throw new Error('Invalid session response')
      if (safeStorage.isEncryptionAvailable()) {
        await writeFile(
          sessionFile(),
          safeStorage.encryptString(
            JSON.stringify({ token: result.accessToken, origin: serviceUrl() })
          ),
          { mode: 0o600 }
        )
      }
      token = result.accessToken
      return result.user
    }
    case 'logout':
      if (token) await send('POST', '/auth/logout')
      await forgetSession()
      return null
    case 'projects:list':
      return send('GET', '/projects')
    case 'projects:create':
      return send('POST', '/projects', parseProjectCreate(request.input))
    case 'projects:update':
      return send(
        'PATCH',
        `/projects/${id(request.id)}`,
        parseProjectPatch(request.input)
      )
    case 'projects:delete':
      return send('DELETE', `/projects/${id(request.id)}`)
    case 'episodes:list':
      return send('GET', `/projects/${id(request.projectId)}/episodes`)
    case 'episodes:create':
      return send(
        'POST',
        `/projects/${id(request.projectId)}/episodes`,
        parseEpisodeCreate(request.input)
      )
    case 'episodes:update':
      return send(
        'PATCH',
        `/episodes/${id(request.id)}`,
        parseEpisodePatch(request.input)
      )
    case 'episodes:delete':
      return send('DELETE', `/episodes/${id(request.id)}`)
    default:
      throw new ValidationError('Unknown request')
  }
}

export async function handleRequest(request: ApiRequest): Promise<ApiResponse> {
  try {
    if (!request || typeof request !== 'object')
      throw new ValidationError('Invalid request')
    return { ok: true, data: await perform(request) }
  } catch (error) {
    if (error instanceof HttpError)
      return {
        ok: false,
        status: error.status,
        message: error.message,
        ...(error.missingProvider
          ? { missingProvider: error.missingProvider }
          : {})
      }
    if (error instanceof ValidationError)
      return { ok: false, status: 400, message: '请检查填写内容。' }
    return {
      ok: false,
      status: 0,
      message: '无法连接服务，请确认服务已启动后重试。'
    }
  }
}

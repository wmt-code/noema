import { app, safeStorage } from 'electron'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  parseEpisodeCreate,
  parseEpisodePatch,
  parseProjectCreate,
  parseProjectPatch,
  ValidationError
} from '@noema/shared'
import type { ApiRequest, ApiResponse } from '../shared/api'

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
    message: string
  ) {
    super(message)
  }
}

async function send(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const response = await fetch(`${serviceUrl()}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
    redirect: 'error'
  })
  if (response.status === 401) await forgetSession()
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: '请检查填写内容。',
      401:
        path === '/auth/login'
          ? '邮箱或密码不正确。'
          : '登录已过期，请重新登录。',
      404: '项目或剧集已不存在，请刷新列表。',
      409: '该邮箱已注册，请直接登录。',
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

async function perform(request: ApiRequest): Promise<unknown> {
  switch (request.type) {
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
      return { ok: false, status: error.status, message: error.message }
    if (error instanceof ValidationError)
      return { ok: false, status: 400, message: '请检查填写内容。' }
    return {
      ok: false,
      status: 0,
      message: '无法连接服务，请确认服务已启动后重试。'
    }
  }
}

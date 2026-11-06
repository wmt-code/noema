export const EPISODE_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'] as const
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number]

export type ProjectCreate = { name: string; settings?: Record<string, unknown> }
export type ProjectPatch = { name?: string; settings?: Record<string, unknown> }
export type EpisodeCreate = { title: string; status?: EpisodeStatus }
export type EpisodePatch = { title?: string; status?: EpisodeStatus }

export * from './chat-attachments.js'
export { ValidationError } from './validation.js'
import { ValidationError } from './validation.js'

function fields(
  body: unknown,
  allowed: readonly string[]
): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required')
  }
  const input = body as Record<string, unknown>
  const unexpected = Object.keys(input).find((key) => !allowed.includes(key))
  if (unexpected) throw new ValidationError(`Unexpected field: ${unexpected}`)
  return input
}

function text(
  input: Record<string, unknown>,
  key: string,
  max: number
): string | undefined {
  const value = input[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string')
    throw new ValidationError(`${key} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > max) {
    throw new ValidationError(`${key} must be 1-${max} characters`)
  }
  return trimmed
}

function object(
  input: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = input[key]
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${key} must be a JSON object`)
  }
  return value as Record<string, unknown>
}

function episodeStatus(
  input: Record<string, unknown>
): EpisodeStatus | undefined {
  const value = input.status
  if (value === undefined) return undefined
  if (
    typeof value !== 'string' ||
    !EPISODE_STATUSES.includes(value as EpisodeStatus)
  ) {
    throw new ValidationError(
      `status must be one of: ${EPISODE_STATUSES.join(', ')}`
    )
  }
  return value as EpisodeStatus
}

export function parseProjectCreate(body: unknown): ProjectCreate {
  const input = fields(body, ['name', 'settings'])
  const name = text(input, 'name', 80)
  if (name === undefined) throw new ValidationError('name is required')
  return { name, settings: object(input, 'settings') }
}

export function parseProjectPatch(body: unknown): ProjectPatch {
  const input = fields(body, ['name', 'settings'])
  const patch = {
    name: text(input, 'name', 80),
    settings: object(input, 'settings')
  }
  if (patch.name === undefined && patch.settings === undefined) {
    throw new ValidationError('At least one of name, settings is required')
  }
  return patch
}

export function parseEpisodeCreate(body: unknown): EpisodeCreate {
  const input = fields(body, ['title', 'status'])
  const title = text(input, 'title', 200)
  if (title === undefined) throw new ValidationError('title is required')
  return { title, status: episodeStatus(input) }
}

export function parseEpisodePatch(body: unknown): EpisodePatch {
  const input = fields(body, ['title', 'status'])
  const patch = {
    title: text(input, 'title', 200),
    status: episodeStatus(input)
  }
  if (patch.title === undefined && patch.status === undefined) {
    throw new ValidationError('At least one of title, status is required')
  }
  return patch
}

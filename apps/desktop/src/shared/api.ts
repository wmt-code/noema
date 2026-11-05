import type {
  EpisodeCreate,
  EpisodePatch,
  ProjectCreate,
  ProjectPatch,
  EpisodeStatus
} from '@noema/shared'

export type User = { id: string; email: string }
export type Project = {
  id: string
  name: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
export type Episode = {
  id: string
  projectId: string
  title: string
  status: EpisodeStatus
  createdAt: string
  updatedAt: string
}

export type ApiRequest =
  | { type: 'session' | 'logout' | 'projects:list' }
  | { type: 'login' | 'register'; email: string; password: string }
  | { type: 'projects:create'; input: ProjectCreate }
  | { type: 'projects:update'; id: string; input: ProjectPatch }
  | { type: 'projects:delete'; id: string }
  | { type: 'episodes:list'; projectId: string }
  | { type: 'episodes:create'; projectId: string; input: EpisodeCreate }
  | { type: 'episodes:update'; id: string; input: EpisodePatch }
  | { type: 'episodes:delete'; id: string }

export type ApiResponse =
  { ok: true; data: unknown } | { ok: false; status: number; message: string }

export type DesktopApi = {
  request: (request: ApiRequest) => Promise<ApiResponse>
}

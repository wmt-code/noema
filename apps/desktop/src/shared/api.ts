import type { ChatAttachment } from '@noema/shared'
import type {
  EpisodeCreate,
  EpisodePatch,
  ProjectCreate,
  ProjectPatch,
  EpisodeStatus
} from '@noema/shared'

export type User = { id: string; email: string }
export type AgentProvider =
  'openai' | 'anthropic' | 'deepseek' | 'openai-compatible'
export type ThinkingLevel =
  'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type AgentModel = {
  provider: AgentProvider
  id: string
  name: string
  thinkingLevels: ThinkingLevel[]
}
export type ChatThread = {
  id: string
  title: string
  updatedAt: string
  archived: boolean
  projectId: string | null
  episodeId: string | null
}
export type ModelCredential = {
  provider: AgentProvider | 'tavily'
  baseUrl: string | null
  updatedAt: string
}
export type AgentConfig = {
  provider: AgentProvider
  model: string
  thinkingLevel: ThinkingLevel
  streaming: boolean
  systemPrompt: string
  tools: ('read_context' | 'web_search')[]
  limits: {
    timeoutMs: number
    maxTurns: number
    maxToolCalls: number
    maxTokens: number
    maxResponseBytes: number
  }
}
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
  | { type: 'chats:open-source'; url: string }
  | { type: 'chats:list'; projectId: string | null }
  | { type: 'chats:create'; projectId: string | null; episodeId: string | null }
  | {
      type:
        'chats:stream-ticket' | 'chats:get' | 'chats:history' | 'chats:delete'
      id: string
    }
  | {
      type: 'chats:update'
      id: string
      data: { title?: string; archived?: boolean }
    }
  | { type: 'chats:append'; id: string; item: unknown }
  | { type: 'models:list' | 'credentials:list' }
  | {
      type: 'credentials:save'
      provider: ModelCredential['provider']
      apiKey: string
      baseUrl?: string
    }
  | { type: 'credentials:delete'; provider: ModelCredential['provider'] }
  | { type: 'agent:config'; projectId: string | null }
  | { type: 'agent:save'; projectId: string | null; config: AgentConfig }
  | {
      type: 'agent:run'
      resource: 'projects' | 'episodes'
      id: string
      prompt: string
      attachments?: ChatAttachment[]
    }
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
  | { ok: true; data: unknown }
  | {
      ok: false
      status: number
      message: string
      missingProvider?: AgentProvider
    }

export type DesktopApi = {
  request: (request: ApiRequest) => Promise<ApiResponse>
}

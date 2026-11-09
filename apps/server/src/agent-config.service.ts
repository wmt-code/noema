import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
  NotFoundException
} from '@nestjs/common'
import { readChatAttachments } from './agent-attachments.js'
import {
  getSupportedThinkingLevels,
  type Message,
  type ImageContent
} from '@earendil-works/pi-ai'
import { z } from 'zod'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import {
  AgentService,
  agentLimitsSchema,
  type AgentScope
} from './agent.service.js'
import { AgentModelService } from './agent-model.service.js'
import { ModelCredentialService } from './model-credential.service.js'
import { webSearchTool } from './web-search.js'
import { PrismaService } from './prisma.service.js'
import { OwnershipService } from './ownership.service.js'

export const providerSchema = z.enum([
  'openai',
  'anthropic',
  'deepseek',
  'openai-compatible'
])
export const agentConfigSchema = z.strictObject({
  provider: providerSchema,
  model: z.string().trim().min(1).max(150),
  systemPrompt: z.string().trim().min(1).max(16000),
  tools: z
    .array(z.enum(['read_context', 'web_search']))
    .max(2)
    .refine((items) => new Set(items).size === items.length)
    .default([]),
  streaming: z.boolean().default(true),
  thinkingLevel: z
    .enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
    .default('off'),
  limits: agentLimitsSchema.default(() => agentLimitsSchema.parse({}))
})
const runInputSchema = z
  .strictObject({
    prompt: z.string().trim().max(16000),
    attachments: z.array(z.unknown()).max(3).optional()
  })
  .refine((value) => !!value.prompt || !!value.attachments?.length)
const runOutputSchema = z.string().trim().min(1).max(100000)

export function parseAgentInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new BadRequestException('Invalid agent parameters')
  return result.data
}

@Injectable()
export class AgentConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly models: AgentModelService,
    private readonly credentials: ModelCredentialService,
    private readonly runtime: AgentService
  ) {}

  async get(userId: string, projectId: string | null) {
    if (projectId === null) {
      const row = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { chatConfig: true }
      })
      return row.chatConfig ? agentConfigSchema.parse(row.chatConfig) : null
    }
    await this.ownership.assertOwned(userId, 'project', projectId)
    const row = await this.prisma.agentConfig.findUnique({
      where: { projectId }
    })
    return row ? agentConfigSchema.parse(row.config) : null
  }

  async save(userId: string, projectId: string | null, body: unknown) {
    if (projectId !== null)
      await this.ownership.assertOwned(userId, 'project', projectId)
    const config = parseAgentInput(agentConfigSchema, body)
    if (
      config.provider !== 'openai-compatible' &&
      !getSupportedThinkingLevels(
        this.models.model(config.provider, config.model)
      ).includes(config.thinkingLevel)
    )
      throw new BadRequestException('Unsupported thinking level')
    if (projectId === null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { chatConfig: config }
      })
      return config
    }
    await this.prisma.agentConfig.upsert({
      where: { projectId },
      create: { projectId, config },
      update: { config }
    })
    return config
  }

  async run(
    scope: AgentScope,
    body: unknown,
    signal?: AbortSignal,
    chat?: {
      projectId: string | null
      history: {
        role: 'user' | 'assistant'
        text: string
        images: ImageContent[]
      }[]
      memory: string
      onDelta: (type: 'text' | 'reasoning', delta: string) => void
    }
  ) {
    await this.ownership.assertOwned(
      scope.user.id,
      scope.resource,
      scope.resourceId
    )
    const input = parseAgentInput(runInputSchema, body)
    const attachments = readChatAttachments(input.attachments)
    const episode =
      scope.resource === 'episode'
        ? await this.prisma.episode.findFirst({
            where: {
              id: scope.resourceId,
              project: { ownerId: scope.user.id }
            },
            select: { projectId: true }
          })
        : null
    if (scope.resource === 'episode' && !episode)
      throw new NotFoundException('Resource not found')
    const projectId = chat
      ? chat.projectId
      : (episode?.projectId ?? scope.resourceId)
    const config = await this.get(scope.user.id, projectId)
    if (!config)
      throw new ConflictException('Configure the project agent first')
    const provider = await this.models.resolve(
      scope.user.id,
      config.provider,
      config.model,
      config.thinkingLevel !== 'off'
    )
    if (attachments.images.length && !provider.model.input.includes('image'))
      throw new UnprocessableEntityException('Model cannot accept images')
    const tools: AgentTool[] = []
    if (
      scope.resource !== 'chatThread' &&
      config.tools.includes('read_context')
    )
      tools.push({
        name: 'read_context',
        label: '读取当前上下文',
        description: 'Read the current project or episode name and identifier.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false
        },
        execute: async (_, __, signal) => {
          signal?.throwIfAborted()
          await this.ownership.assertOwned(
            scope.user.id,
            scope.resource,
            scope.resourceId
          )
          const context =
            scope.resource === 'project'
              ? await this.prisma.project.findFirst({
                  where: { id: scope.resourceId, ownerId: scope.user.id },
                  select: { id: true, name: true }
                })
              : await this.prisma.episode.findFirst({
                  where: {
                    id: scope.resourceId,
                    project: { ownerId: scope.user.id }
                  },
                  select: {
                    id: true,
                    title: true,
                    project: { select: { id: true, name: true } }
                  }
                })
          if (!context) throw new NotFoundException('Resource not found')
          signal?.throwIfAborted()
          return {
            content: [{ type: 'text', text: JSON.stringify(context) }],
            details: null
          }
        }
      })
    if (config.tools.includes('web_search')) {
      tools.push(
        await webSearchTool(
          this.credentials,
          scope.user.id,
          config.provider,
          config.limits.timeoutMs
        )
      )
    }
    const text = await this.runtime.run(
      scope,
      {
        ...provider,
        ...attachments,
        thinkingLevel: config.thinkingLevel,
        ...(chat
          ? {
              history: chat.history.map(({ role, text, images }): Message => {
                const timestamp = Date.now()
                if (role === 'user')
                  return {
                    role,
                    timestamp,
                    content: images.length
                      ? [{ type: 'text', text }, ...images]
                      : text
                  }
                return {
                  role,
                  content: [{ type: 'text', text }],
                  timestamp,
                  api: provider.model.api,
                  provider: config.provider,
                  model: config.model,
                  stopReason: 'stop',
                  usage: {
                    input: 0,
                    output: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                    totalTokens: 0,
                    cost: {
                      input: 0,
                      output: 0,
                      cacheRead: 0,
                      cacheWrite: 0,
                      total: 0
                    }
                  }
                }
              }),
              onDelta: config.streaming ? chat.onDelta : undefined
            }
          : {}),
        outputFormat: 'text',
        systemPrompt: config.systemPrompt,
        tools,
        limits: config.limits,
        inputSchema: runInputSchema,
        outputSchema: runOutputSchema,
        prompt: (value) =>
          [chat?.memory, value.prompt || '请阅读附件。']
            .filter(Boolean)
            .join('\n\n')
      },
      input,
      signal
    )
    if (chat && !config.streaming) chat.onDelta('text', text)
    return { text }
  }
}

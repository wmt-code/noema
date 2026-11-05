import {
  Agent,
  type AgentTool,
  type StreamFn
} from '@earendil-works/pi-agent-core'
import type { Api, Model } from '@earendil-works/pi-ai'
import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common'
import { z } from 'zod'
import type { AuthRequest } from './auth.guard.js'
import { OwnershipService, type Resource } from './ownership.service.js'

const limitsSchema = z.strictObject({
  timeoutMs: z.number().int().min(1).max(300_000).default(60_000),
  maxTurns: z.number().int().min(1).max(20).default(4),
  maxToolCalls: z.number().int().min(0).max(50).default(8),
  maxTokens: z.number().int().min(1).max(32_768).default(4096),
  maxResponseBytes: z.number().int().min(1).max(1_048_576).default(131_072)
})

/** Trusted server configuration, never accepted directly from an HTTP body. */
export interface AgentDefinition<Input, Output> {
  systemPrompt: string
  model: Model<Api>
  streamFn: StreamFn
  inputSchema: z.ZodType<Input>
  outputSchema: z.ZodType<Output>
  prompt: (input: Input) => string
  /** Read-only tools scoped to this caller; persist only after run() succeeds. */
  tools?: AgentTool[]
  limits?: z.input<typeof limitsSchema>
}

export interface AgentScope {
  user: AuthRequest['user']
  resource: Resource
  resourceId: string
}

@Injectable()
export class AgentService {
  constructor(private readonly ownership: OwnershipService) {}

  async run<Input, Output>(
    scope: AgentScope,
    definition: AgentDefinition<Input, Output>,
    input: unknown,
    signal?: AbortSignal
  ): Promise<Output> {
    // Controllers must pass CurrentUser from AuthGuard, never an owner from the body.
    if (!scope.user?.id) throw new UnauthorizedException()
    await this.ownership.assertOwned(
      scope.user.id,
      scope.resource,
      scope.resourceId
    )
    const parsed = definition.inputSchema.safeParse(input)
    if (!parsed.success) throw new BadRequestException('Invalid agent input')
    const limits = limitsSchema.parse(definition.limits ?? {})
    const prompt = definition.prompt(parsed.data)
    if (Buffer.byteLength(prompt, 'utf8') > 65_536) {
      throw new BadRequestException('Agent input exceeds size limit')
    }
    if (signal?.aborted)
      throw new ServiceUnavailableException('Agent cancelled')

    let turns = 0
    let toolCalls = 0
    let failure: Error | undefined
    let rejectRun!: (error: Error) => void
    const interrupted = new Promise<never>((_, reject) => {
      rejectRun = reject
    })
    const fail = (error: Error) => {
      if (failure) return
      failure = error
      agent.abort()
      rejectRun(error)
    }
    // A new instance owns every run's transcript, queues and cancellation state.
    const agent = new Agent({
      initialState: {
        systemPrompt: definition.systemPrompt,
        model: definition.model,
        tools: definition.tools ?? [],
        thinkingLevel: 'off'
      },
      streamFn: (model, context, options) =>
        definition.streamFn(model, context, {
          ...options,
          maxTokens: Math.min(limits.maxTokens, model.maxTokens)
        }),
      toolExecution: 'sequential',
      prepareRequest: () => {
        if (failure) throw failure
        if (++turns > limits.maxTurns) {
          fail(new BadGatewayException('Agent turn limit exceeded'))
          throw failure
        }
      },
      beforeToolCall: async () => {
        if (!failure && ++toolCalls > limits.maxToolCalls) {
          fail(new BadGatewayException('Agent tool limit exceeded'))
        }
        if (failure)
          return { block: true, reason: 'Run stopped', terminate: true }
      }
    })
    const unsubscribe = agent.subscribe((event) => {
      if (event.type === 'tool_execution_end' && event.isError) {
        fail(new BadGatewayException('Agent tool failed'))
      }
      if (
        (event.type === 'message_update' || event.type === 'message_end') &&
        event.message.role === 'assistant'
      ) {
        if (
          Buffer.byteLength(JSON.stringify(event.message.content), 'utf8') >
          limits.maxResponseBytes
        ) {
          fail(new BadGatewayException('Agent response exceeds size limit'))
        }
      }
    })
    const cancel = () =>
      fail(new ServiceUnavailableException('Agent cancelled'))
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(
      () => fail(new GatewayTimeoutException('Agent execution timed out')),
      limits.timeoutMs
    )
    try {
      await Promise.race([agent.prompt(prompt), interrupted])
      if (failure) throw failure
      const last = agent.state.messages.at(-1)
      if (last?.role !== 'assistant' || last.stopReason !== 'stop') {
        throw new BadGatewayException('Agent did not complete successfully')
      }
      if (last.content.some((part) => part.type === 'toolCall')) {
        throw new BadGatewayException('Agent returned unfinished tool calls')
      }
      const text = last.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('')
      let value: unknown
      try {
        value = JSON.parse(text)
      } catch {
        throw new BadGatewayException('Agent output is not valid JSON')
      }
      const output = definition.outputSchema.safeParse(value)
      if (!output.success) {
        throw new BadGatewayException('Agent output does not match schema')
      }
      return output.data
    } catch (error) {
      if (failure) throw failure
      if (error instanceof BadGatewayException) throw error
      // Provider errors may contain credentials, URLs or prompt content.
      throw new BadGatewayException('Agent execution failed')
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      unsubscribe()
      agent.abort()
    }
  }
}

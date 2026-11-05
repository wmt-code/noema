import { AssistantMessageEventStream } from '@earendil-works/pi-ai'
import { z } from 'zod'

export const model = {
  id: 'test-model',
  name: 'Test model',
  api: 'openai-completions',
  provider: 'test',
  baseUrl: 'http://unused.invalid',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 8192,
  maxTokens: 2048
}

export function response(content = '{"title":"故事"}', stopReason = 'stop') {
  const stream = new AssistantMessageEventStream()
  const message = {
    role: 'assistant',
    content:
      typeof content === 'string' ? [{ type: 'text', text: content }] : content,
    api: model.api,
    provider: model.provider,
    model: model.id,
    stopReason,
    timestamp: Date.now(),
    usage: {
      input: 1,
      output: 1,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 2,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    }
  }
  stream.push({ type: 'start', partial: message })
  if (stopReason === 'error' || stopReason === 'aborted') {
    stream.push({
      type: 'error',
      reason: stopReason,
      error: { ...message, errorMessage: 'private provider details' }
    })
  } else {
    stream.push({ type: 'done', reason: stopReason, message })
  }
  return stream
}

export function definition(overrides = {}) {
  return {
    systemPrompt: 'Return a JSON object with a title.',
    model,
    streamFn: () => response(),
    inputSchema: z.strictObject({ story: z.string().trim().min(1) }),
    outputSchema: z.strictObject({ title: z.string().min(1) }),
    prompt: ({ story }) => story,
    ...overrides
  }
}

export const toolCall = (id = 'call-1', args = {}) => ({
  type: 'toolCall',
  id,
  name: 'read_context',
  arguments: args
})

export const readTool = (execute) => ({
  name: 'read_context',
  label: 'Read context',
  description: 'Read story context',
  parameters: { type: 'object', properties: {}, additionalProperties: false },
  execute
})

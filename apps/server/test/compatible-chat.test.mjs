import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { AgentModelService } from '../dist/agent-model.service.js'
import { AgentService } from '../dist/agent.service.js'

test('compatible chat sends plain text as a string and keeps image parts', async (t) => {
  const payloads = []
  t.mock.method(globalThis, 'fetch', async (_input, options) => {
    const { messages } = JSON.parse(options.body)
    const content = messages.at(-1).content
    payloads.push(content)
    if (
      Array.isArray(content) &&
      content.every((part) => part.type === 'text')
    ) {
      return Response.json(
        { error: { message: 'Expected a string' } },
        { status: 400 }
      )
    }
    const chunk = {
      choices: [{ index: 0, delta: { content: 'OK' }, finish_reason: 'stop' }]
    }
    return new Response(
      'data: ' + JSON.stringify(chunk) + '\n\ndata: [DONE]\n\n',
      {
        headers: { 'content-type': 'text/event-stream' }
      }
    )
  })
  const adapter = new AgentModelService({
    get: async () => ({ apiKey: 'test', baseUrl: 'https://gateway.example/v1' })
  })
  const runtime = new AgentService({ assertOwned: async () => {} })
  const scope = {
    user: { id: 'test' },
    resource: 'project',
    resourceId: 'test'
  }
  const definition = {
    ...(await adapter.resolve('test', 'openai-compatible', 'test')),
    systemPrompt: 'Test',
    inputSchema: z.string(),
    outputSchema: z.string().min(1),
    outputFormat: 'text',
    prompt: (text) => text
  }
  assert.equal(await runtime.run(scope, definition, 'hello'), 'OK')
  assert.equal(payloads[0], 'hello')
  const image = { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' }
  assert.equal(
    await runtime.run(scope, { ...definition, images: [image] }, 'image'),
    'OK'
  )
  assert.deepEqual(payloads[1], [
    { type: 'text', text: 'image' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' } }
  ])
})

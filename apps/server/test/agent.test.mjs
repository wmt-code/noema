import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AssistantMessageEventStream } from '@earendil-works/pi-ai'
import { NotFoundException } from '@nestjs/common'
import { AgentService } from '../dist/agent.service.js'
import { definition, response, toolCall, readTool } from './agent-fixtures.mjs'

const scope = {
  user: { id: 'owner', email: 'owner@example.com' },
  resource: 'episode',
  resourceId: 'episode'
}
const input = { story: '故事' }
const service = () => new AgentService({ assertOwned: async () => {} })
const status = (code, message) => (error) => {
  assert.equal(error.getStatus(), code)
  if (message) assert.match(error.message, message)
  assert.doesNotMatch(error.message, /private provider/)
  return true
}

test('validates ownership and input before invoking the provider', async () => {
  let requests = 0
  const config = definition({
    streamFn: () => {
      requests++
      return response()
    }
  })
  const denied = new AgentService({
    assertOwned: async (...args) => {
      assert.deepEqual(args, ['owner', 'episode', 'episode'])
      throw new NotFoundException()
    }
  })
  await assert.rejects(denied.run(scope, config, input), status(404))
  await assert.rejects(
    service().run({ ...scope, user: undefined }, config, input),
    status(401)
  )
  for (const invalid of [
    { story: '' },
    { story: 1 },
    { story: 'ok', extra: true }
  ]) {
    await assert.rejects(service().run(scope, config, invalid), status(400))
  }
  await assert.rejects(
    service().run(scope, config, { story: '长'.repeat(22000) }),
    status(400)
  )
  assert.equal(requests, 0)
})

test('independent concurrent instances receive only their own prompt and token limit', async () => {
  const runtime = service()
  const run = (story) =>
    runtime.run(
      scope,
      definition({
        limits: { maxTokens: 100 },
        streamFn: async (_, context, options) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          assert.equal(context.messages.length, 2)
          assert.equal(context.messages[0].role, 'system')
          assert.deepEqual(context.messages[1].content, [
            { type: 'text', text: story }
          ])
          assert.equal(options.maxTokens, 100)
          return response(JSON.stringify({ title: story }))
        }
      }),
      { story }
    )
  assert.deepEqual(await Promise.all([run('甲'), run('乙')]), [
    { title: '甲' },
    { title: '乙' }
  ])
})

test('rejects malformed, invalid and incomplete output without exposing provider details', async () => {
  for (const [text, reason] of [
    ['not json', 'stop'],
    ['{}', 'stop'],
    ['{"title":1}', 'stop'],
    ['{"title":"ok","extra":1}', 'stop'],
    ['{"title":"ok"}', 'length'],
    ['{"title":"ok"}', 'error'],
    ['{"title":"ok"}', 'aborted']
  ]) {
    await assert.rejects(
      service().run(
        scope,
        definition({ streamFn: () => response(text, reason) }),
        input
      ),
      status(502)
    )
  }
  await assert.rejects(
    service().run(
      scope,
      definition({
        streamFn: () => {
          throw new Error('private provider details')
        }
      }),
      input
    ),
    status(502)
  )
  // A subsequent run is not poisoned by the previous failure.
  assert.deepEqual(await service().run(scope, definition(), input), {
    title: '故事'
  })
})

test('executes a real Pi tool turn before validating the final output', async () => {
  let calls = 0
  let requests = 0
  const result = await service().run(
    scope,
    definition({
      tools: [
        readTool(async () => {
          calls++
          return { content: [{ type: 'text', text: 'context' }], details: null }
        })
      ],
      streamFn: (_, context) => {
        if (++requests === 1) return response([toolCall()], 'toolUse')
        assert.equal(context.messages.at(-1).role, 'toolResult')
        return response()
      }
    }),
    input
  )
  assert.deepEqual(result, { title: '故事' })
  assert.equal(requests, 2)
  assert.equal(calls, 1)
})

test('bounds repeated turns, tool batches, invalid tool arguments and tool failures', async () => {
  let calls = 0
  let requests = 0
  const tool = readTool(async () => {
    calls++
    return { content: [], details: null }
  })
  const looping = definition({
    tools: [tool],
    limits: { maxTurns: 2 },
    streamFn: () => {
      requests++
      return response([toolCall(`call-${requests}`)], 'toolUse')
    }
  })
  await assert.rejects(
    service().run(scope, looping, input),
    status(502, /turn limit/)
  )
  assert.equal(requests, 2)
  assert.equal(calls, 2)
  calls = 0
  await assert.rejects(
    service().run(
      scope,
      definition({
        tools: [tool],
        limits: { maxToolCalls: 1 },
        streamFn: () =>
          response([toolCall('a'), toolCall('b'), toolCall('c')], 'toolUse')
      }),
      input
    ),
    status(502, /tool limit/)
  )
  assert.equal(calls, 1)
  calls = 0
  await assert.rejects(
    service().run(
      scope,
      definition({
        tools: [tool],
        streamFn: () => response([toolCall('bad', { extra: 1 })], 'toolUse')
      }),
      input
    ),
    status(502)
  )
  assert.equal(calls, 0)
  await assert.rejects(
    service().run(
      scope,
      definition({
        tools: [
          readTool(async () => {
            throw new Error('private provider details')
          })
        ],
        streamFn: () => response([toolCall()], 'toolUse')
      }),
      input
    ),
    status(502, /tool failed/)
  )
})

test('rejects oversized responses', async () => {
  await assert.rejects(
    service().run(
      scope,
      definition({ limits: { maxResponseBytes: 10 } }),
      input
    ),
    status(502, /size limit/)
  )
})

test('timeout and external cancellation abort streams, even if the provider never settles', async () => {
  let providerSignal
  const hanging = definition({
    limits: { timeoutMs: 25 },
    streamFn: (_, __, options) => {
      providerSignal = options.signal
      return new AssistantMessageEventStream()
    }
  })
  await assert.rejects(service().run(scope, hanging, input), status(504))
  assert.equal(providerSignal.aborted, true)
  const controller = new AbortController()
  const cancelled = service().run(
    scope,
    definition({
      streamFn: (_, __, options) => {
        providerSignal = options.signal
        queueMicrotask(() => controller.abort())
        return new AssistantMessageEventStream()
      }
    }),
    input,
    controller.signal
  )
  await assert.rejects(cancelled, status(503))
  assert.equal(providerSignal.aborted, true)
  let invoked = false
  await assert.rejects(
    service().run(
      scope,
      definition({
        streamFn: () => {
          invoked = true
          return response()
        }
      }),
      input,
      controller.signal
    ),
    status(503)
  )
  assert.equal(invoked, false)
})

test('rejects invalid execution limits before starting a model request', async () => {
  for (const limits of [
    { maxTurns: 0 },
    { timeoutMs: Infinity },
    { maxToolCalls: -1 },
    { maxTokens: 0 }
  ]) {
    let invoked = false
    await assert.rejects(
      service().run(
        scope,
        definition({
          limits,
          streamFn: () => {
            invoked = true
            return response()
          }
        }),
        input
      )
    )
    assert.equal(invoked, false)
  }
})

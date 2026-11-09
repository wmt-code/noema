import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nock from 'nock'
import { testApp, testDatabase } from './database.mjs'
import { ModelCredentialService } from '../dist/model-credential.service.js'

test(
  'agent settings and project/episode APIs use encrypted user credentials',
  { timeout: 60000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'noema-credentials-'))
    const previousDirectory = process.env.NOEMA_DATA_DIR
    process.env.NOEMA_DATA_DIR = directory
    t.after(async () => {
      if (previousDirectory === undefined) delete process.env.NOEMA_DATA_DIR
      else process.env.NOEMA_DATA_DIR = previousDirectory
      await rm(directory, { recursive: true, force: true })
    })
    const { prisma, url } = await testDatabase(t)
    const base = await testApp(t, url)
    const originalFetch = globalThis.fetch
    let mode = 'success'
    let calls = 0
    let toolRequests = 0
    let observedContext
    let deepseekSearchCalls = 0
    const deepseekKey = 'sk-test-deepseek-only'
    const deepseekUrl = 'https://api.deepseek.com'
    const secret = 'sk-test-noema-private'
    globalThis.fetch = async (input, options) => {
      const url = new URL(
        typeof input === 'string' ? input : (input.url ?? input)
      )
      if (url.origin === base) return originalFetch(input, options)
      if (url.origin === deepseekUrl) {
        assert.equal(
          new Headers(options.headers).get('authorization'),
          `Bearer ${deepseekKey}`
        )
        const body = JSON.parse(options.body)
        if (url.pathname === '/v1/tools/search') {
          assert.deepEqual(body, {
            query: '海边拍摄',
            count: 5,
            need_content: false
          })
          deepseekSearchCalls++
          return Response.json({
            results: [
              {
                title: '海边',
                url: 'https://example.org/sea',
                summary: '落日',
                snippet: '海边的落日'
              }
            ]
          })
        }
        assert.equal(url.pathname, '/chat/completions')
        assert.ok(
          body.tools.some((tool) => tool.function.name === 'web_search')
        )
        const last = body.messages.at(-1)
        const done = last.role === 'tool'
        if (done) assert.match(last.content, /example\.org\/sea/)
        const delta = done
          ? { content: '搜索成功' }
          : {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_search',
                  type: 'function',
                  function: {
                    name: 'web_search',
                    arguments: '{"query":"海边拍摄"}'
                  }
                }
              ]
            }
        return new Response(
          'data: ' +
            JSON.stringify({
              choices: [
                { index: 0, delta, finish_reason: done ? 'stop' : 'tool_calls' }
              ]
            }) +
            '\n\ndata: [DONE]\n\n',
          { headers: { 'content-type': 'text/event-stream' } }
        )
      }
      assert.equal(url.origin, 'https://api.openai.com')
      calls++
      assert.equal(
        new Headers(options.headers).get('authorization'),
        `Bearer ${secret}`
      )
      if (mode === 'failure')
        return new Response(JSON.stringify({ error: { message: secret } }), {
          status: 429,
          headers: { 'content-type': 'application/json' }
        })
      if (mode === 'timeout')
        return new Promise((_, reject) => {
          if (options.signal.aborted) return reject(new Error('aborted'))
          options.signal.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true }
          )
        })
      const body = JSON.parse(options.body)
      assert.ok(body.max_output_tokens <= 4096)
      let item = {
        type: 'message',
        id: 'msg_1',
        role: 'assistant',
        content: [
          {
            type: 'output_text',
            text: mode === 'invalid' ? '   ' : '调用成功'
          }
        ]
      }
      if ((mode === 'tool' || mode === 'search') && toolRequests++ === 0) {
        const name = mode === 'search' ? 'web_search' : 'read_context'
        assert.ok(body.tools.some((tool) => tool.name === name))
        item = {
          type: 'function_call',
          id: 'fc_1',
          call_id: 'call_1',
          name,
          arguments: mode === 'search' ? '{"query":"海边拍摄"}' : '{}'
        }
      } else if (mode === 'tool' || mode === 'search') {
        observedContext = JSON.parse(
          body.input.find((item) => item.type === 'function_call_output').output
        )
      }
      const events = [
        { type: 'response.output_item.done', output_index: 0, item },
        {
          type: 'response.completed',
          response: {
            id: 'resp_1',
            status: 'completed',
            output: [item],
            usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
          }
        }
      ]
      return new Response(
        events
          .map(
            (event) =>
              `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
          )
          .join(''),
        { headers: { 'content-type': 'text/event-stream' } }
      )
    }
    t.after(() => {
      globalThis.fetch = originalFetch
    })
    const send = (method, path, token, body) =>
      originalFetch(`${base}${path}`, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      })
    const account = async (email) => {
      const body = { email, password: 'a-very-secure-passphrase' }
      assert.equal(
        (await send('POST', '/auth/register', undefined, body)).status,
        201
      )
      return await (await send('POST', '/auth/login', undefined, body)).json()
    }
    const owner = await account('settings-owner@example.com')
    const stranger = await account('settings-stranger@example.com')
    const token = owner.accessToken
    const project = await (
      await send('POST', '/projects', token, { name: '当前项目' })
    ).json()
    const episode = await (
      await send('POST', `/projects/${project.id}/episodes`, token, {
        title: '当前剧集'
      })
    ).json()
    const configPath = `/projects/${project.id}/agent-config`
    const runPath = `/projects/${project.id}/agent-runs`
    const catalog = await (await send('GET', '/agent-models', token)).json()
    const model = catalog.find(
      (item) => item.provider === 'openai' && item.id === 'gpt-4.1-mini'
    )
    assert.ok(model)
    const config = {
      provider: 'openai',
      model: model.id,
      systemPrompt: '你是一位创作助手。',
      tools: ['read_context']
    }

    await t.test(
      'requires authentication and rejects foreign resources',
      async () => {
        for (const path of ['/agent-models', '/model-credentials', configPath])
          assert.equal((await send('GET', path)).status, 401)
        for (const path of [runPath, `/episodes/${episode.id}/agent-runs`]) {
          assert.equal(
            (await send('POST', path, stranger.accessToken, { prompt: 'test' }))
              .status,
            404
          )
        }
        assert.equal(
          (await send('GET', configPath, stranger.accessToken)).status,
          404
        )
        assert.equal(
          (await send('PUT', configPath, stranger.accessToken, config)).status,
          404
        )
        assert.equal(calls, 0)
      }
    )
    await t.test(
      'chat history belongs to one account and persists idempotently',
      async () => {
        const thread = await (
          await send('POST', '/chats', token, {
            projectId: project.id,
            episodeId: episode.id
          })
        ).json()
        const path = '/chats/' + thread.id
        const message = {
          id: 'hello',
          role: 'user',
          content: [{ type: 'text', text: 'private note' }],
          attachments: []
        }
        const item = { message, parentId: null }
        for (const [method, suffix, body] of [
          ['GET', ''],
          ['GET', '/messages'],
          ['POST', '/messages', item],
          ['PATCH', '', { title: 'foreign' }],
          [
            'POST',
            '/stream',
            { prompt: 'test', attachments: [], historyIds: [] }
          ],
          ['DELETE', '']
        ]) {
          assert.equal(
            (await send(method, path + suffix, stranger.accessToken, body))
              .status,
            404
          )
        }
        assert.deepEqual(
          await (
            await send(
              'GET',
              '/chats?project=' + project.id,
              stranger.accessToken
            )
          ).json(),
          []
        )
        for (let i = 0; i < 2; i++)
          assert.equal(
            (await send('POST', path + '/messages', token, item)).status,
            204
          )
        assert.deepEqual(
          await (await send('GET', path + '/messages', token)).json(),
          { messages: [item] }
        )
        assert.equal((await send('DELETE', path, token)).status, 204)
        assert.equal(
          await prisma.chatMessage.count({ where: { threadId: thread.id } }),
          0
        )
      }
    )
    await t.test(
      'validates configuration, credentials and run parameters',
      async () => {
        const emptyConfig = await send('GET', configPath, token)
        assert.equal(await emptyConfig.text(), '{"config":null}')
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          409
        )
        for (const invalid of [
          { ...config, provider: 'unknown' },
          { ...config, provider: 'tavily' },
          { ...config, tools: ['web_search', 'web_search'] },
          { ...config, model: 'missing' },
          { ...config, tools: ['shell'] },
          { ...config, apiKey: secret },
          { ...config, baseUrl: 'http://localhost' },
          { ...config, systemPrompt: '' },
          { ...config, limits: { maxTurns: 0 } }
        ])
          assert.equal(
            (await send('PUT', configPath, token, invalid)).status,
            400
          )
        assert.equal(
          (
            await send('PUT', '/model-credentials/openai', token, {
              apiKey: '  '
            })
          ).status,
          400
        )
        assert.equal(
          (
            await send('PUT', '/model-credentials/unknown', token, {
              apiKey: secret
            })
          ).status,
          400
        )
        assert.equal((await send('PUT', configPath, token, config)).status, 200)
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          503
        )
        for (const body of [
          { prompt: '' },
          { prompt: 'test', ownerId: stranger.user.id },
          { prompt: 'test', tools: ['shell'] }
        ]) {
          assert.equal((await send('POST', runPath, token, body)).status, 400)
        }
        for (const attachment of [
          {
            name: '伪造.png',
            contentType: 'image/png',
            url: 'data:image/png;base64,YQ=='
          },
          {
            name: '链接.png',
            contentType: 'image/png',
            url: 'https://elsewhere.example/file'
          },
          {
            name: 'binary.txt',
            contentType: 'text/plain',
            url: 'data:text/plain;base64,/w=='
          }
        ]) {
          assert.equal(
            (
              await send('POST', runPath, token, {
                prompt: '检查附件',
                attachments: [attachment]
              })
            ).status,
            400
          )
        }
        assert.equal(calls, 0)
      }
    )
    await t.test(
      'stores ciphertext, never returns secrets, and reloads after restart',
      async () => {
        assert.equal(
          (
            await send('PUT', '/model-credentials/openai', token, {
              apiKey: secret
            })
          ).status,
          204
        )
        const rows = await prisma.modelCredential.findMany()
        assert.equal(rows.length, 1)
        assert.ok(!rows[0].encryptedKey.includes(secret))
        const listed = await (
          await send('GET', '/model-credentials', token)
        ).json()
        assert.deepEqual(Object.keys(listed[0]).sort(), [
          'baseUrl',
          'provider',
          'updatedAt'
        ])
        assert.deepEqual(
          await (
            await send('GET', '/model-credentials', stranger.accessToken)
          ).json(),
          []
        )
        assert.equal(
          (
            await new ModelCredentialService(prisma).get(
              owner.user.id,
              'openai'
            )
          ).apiKey,
          secret
        )
        assert.equal(
          (
            await send('PUT', '/model-credentials/openai', token, {
              apiKey: 'sk-replacement'
            })
          ).status,
          204
        )
        assert.equal(
          (
            await new ModelCredentialService(prisma).get(
              owner.user.id,
              'openai'
            )
          ).apiKey,
          'sk-replacement'
        )
        assert.equal(
          (
            await send('PUT', '/model-credentials/openai', token, {
              apiKey: secret
            })
          ).status,
          204
        )
        const saved = rows[0].encryptedKey
        await prisma.modelCredential.update({
          where: {
            userId_provider: { userId: owner.user.id, provider: 'openai' }
          },
          data: { encryptedKey: 'tampered' }
        })
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          503
        )
        await prisma.modelCredential.update({
          where: {
            userId_provider: { userId: owner.user.id, provider: 'openai' }
          },
          data: { encryptedKey: saved }
        })
        const updated = await (await send('GET', configPath, token)).json()
        assert.equal(updated.config.limits.maxTurns, 4)
      }
    )
    await t.test(
      'runs through real Pi and provider adapter for projects and episodes',
      async () => {
        assert.deepEqual(
          await (await send('POST', runPath, token, { prompt: 'test' })).json(),
          { text: '调用成功' }
        )
        mode = 'tool'
        toolRequests = 0
        const result = await send(
          'POST',
          `/episodes/${episode.id}/agent-runs`,
          token,
          { prompt: '读取上下文' }
        )
        assert.equal(result.status, 200)
        assert.equal(observedContext.id, episode.id)
        assert.equal(observedContext.project.id, project.id)
        assert.equal(observedContext.title, '当前剧集')
      }
    )
    await t.test(
      'gateway URLs are isolated from official keys and bound to the saved key',
      async () => {
        const path = '/model-credentials/openai-compatible'
        const baseUrl = 'https://gateway.example/v1'
        const apiKey = 'sk-separate-gateway-key'
        for (const invalid of [
          'http://gateway.example/v1',
          'https://localhost/v1',
          'https://127.0.0.1',
          'https://169.254.169.254',
          'https://[::ffff:7f00:1]',
          'https://[2::1]',
          'https://user:password@gateway.example',
          baseUrl + '?key=private',
          baseUrl + '/chat/completions'
        ]) {
          assert.equal(
            (await send('PUT', path, token, { baseUrl: invalid, apiKey }))
              .status,
            400
          )
        }
        assert.equal(
          (
            await send('PUT', '/model-credentials/openai', token, {
              baseUrl,
              apiKey
            })
          ).status,
          400
        )
        assert.equal((await send('PUT', path, token, { baseUrl })).status, 400)
        assert.equal(
          (await send('PUT', path, token, { baseUrl: baseUrl + '/', apiKey }))
            .status,
          204
        )
        const listed = await (
          await send('GET', '/model-credentials', token)
        ).json()
        assert.equal(
          listed.find((row) => row.provider === 'openai-compatible').baseUrl,
          baseUrl
        )
        assert.ok(!JSON.stringify(listed).includes(apiKey))
        assert.deepEqual(
          await (
            await send('GET', '/model-credentials', stranger.accessToken)
          ).json(),
          []
        )
        const credentials = new ModelCredentialService(prisma)
        assert.deepEqual(
          await credentials.get(owner.user.id, 'openai-compatible'),
          { baseUrl, apiKey }
        )
        await prisma.modelCredential.update({
          where: {
            userId_provider: {
              userId: owner.user.id,
              provider: 'openai-compatible'
            }
          },
          data: { baseUrl: 'https://other.example/v1' }
        })
        await assert.rejects(
          credentials.get(owner.user.id, 'openai-compatible'),
          /Credential storage unavailable/
        )
        assert.equal((await send('DELETE', path, token)).status, 204)
      }
    )
    await t.test(
      'Pi searches with the account Tavily key and returns sources to the model',
      async (t) => {
        const path = '/model-credentials/tavily'
        const key = 'tvly-test-only'
        const searchConfig = {
          ...config,
          tools: ['web_search', 'read_context']
        }
        assert.equal(
          (await send('PUT', configPath, token, searchConfig)).status,
          200
        )
        assert.equal(
          (await send('POST', runPath, token, { prompt: '搜索' })).status,
          503
        )
        assert.equal(
          (await send('PUT', path, token, { apiKey: key })).status,
          204
        )
        assert.deepEqual(
          await (
            await send('GET', '/model-credentials', stranger.accessToken)
          ).json(),
          []
        )
        const source = {
          title: '海边现场',
          url: 'https://example.org/shoot',
          content: '沙滩'
        }
        const upstream = nock('https://api.tavily.com', {
          reqheaders: { authorization: 'Bearer ' + key }
        })
          .post(
            '/search',
            (body) => body.query === '海边拍摄' && body.max_results === 5
          )
          .reply(200, { images: [], results: [source] })
        t.after(() => nock.cleanAll())
        mode = 'search'
        toolRequests = 0
        const result = await send('POST', runPath, token, { prompt: '搜索' })
        assert.equal(result.status, 200)
        assert.ok(upstream.isDone())
        assert.deepEqual(observedContext, [
          { title: source.title, url: source.url, excerpt: source.content }
        ])
        const refused = nock('https://api.tavily.com')
          .post('/search')
          .reply(401, { detail: key })
        toolRequests = 0
        const failed = await send('POST', runPath, token, { prompt: '搜索' })
        assert.equal(failed.status, 502)
        const failure = await failed.text()
        assert.match(failure, /Tavily/)
        assert.ok(!failure.includes(key))
        assert.ok(refused.isDone())
        assert.equal((await send('PUT', configPath, token, config)).status, 200)
        assert.equal((await send('DELETE', path, token)).status, 204)
        mode = 'success'
      }
    )
    await t.test(
      'DeepSeek chats search directly, and a different model can reuse the same key',
      async () => {
        const keyPath = '/model-credentials/deepseek'
        const run = () => send('POST', runPath, token, { prompt: '搜索' })
        const tools = ['web_search']
        assert.ok(
          catalog.some(
            (item) =>
              item.provider === 'deepseek' && item.id === 'deepseek-v4-pro'
          )
        )
        assert.equal(
          (await send('PUT', keyPath, token, { apiKey: deepseekKey })).status,
          204
        )
        const official = {
          ...config,
          provider: 'deepseek',
          model: 'deepseek-v4-pro',
          tools
        }
        assert.equal(
          (await send('PUT', configPath, token, official)).status,
          200
        )
        assert.deepEqual(await (await run()).json(), { text: '搜索成功' })
        assert.equal(deepseekSearchCalls, 1)
        assert.equal(
          (await send('PUT', configPath, token, { ...config, tools })).status,
          200
        )
        mode = 'search'
        toolRequests = 0
        assert.deepEqual(await (await run()).json(), { text: '调用成功' })
        assert.equal(deepseekSearchCalls, 2)
        assert.deepEqual(observedContext, [
          { title: '海边', url: 'https://example.org/sea', excerpt: '落日' }
        ])
        assert.equal((await send('DELETE', keyPath, token)).status, 204)
        assert.equal((await send('PUT', configPath, token, config)).status, 200)
        mode = 'success'
      }
    )
    await t.test(
      'sanitizes provider failures, rejects invalid output and stops on timeout',
      async () => {
        mode = 'failure'
        const before = calls
        const failed = await send('POST', runPath, token, { prompt: 'test' })
        assert.equal(failed.status, 502)
        assert.ok(!(await failed.text()).includes(secret))
        assert.equal(calls, before + 1, 'must not retry a paid request')
        mode = 'invalid'
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          502
        )
        mode = 'timeout'
        await send('PUT', configPath, token, {
          ...config,
          limits: { timeoutMs: 25 }
        })
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          504
        )
        assert.equal(await prisma.scriptRevision.count(), 0)
      }
    )
    await t.test(
      'deleting credentials disables calls and project deletion cascades configuration',
      async () => {
        assert.equal(
          (
            await send(
              'DELETE',
              '/model-credentials/openai',
              stranger.accessToken
            )
          ).status,
          204
        )
        assert.equal(await prisma.modelCredential.count(), 1)
        assert.equal(
          (await send('DELETE', '/model-credentials/openai', token)).status,
          204
        )
        assert.equal(
          (await send('POST', runPath, token, { prompt: 'test' })).status,
          503
        )
        assert.equal(
          (await send('DELETE', `/projects/${project.id}`, token)).status,
          204
        )
        assert.equal(await prisma.agentConfig.count(), 0)
      }
    )
  }
)

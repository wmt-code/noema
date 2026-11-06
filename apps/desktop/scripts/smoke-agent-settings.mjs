import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import electronPath from 'electron'
import { _electron as electron } from 'playwright-core'
import { testDatabase, testApp } from '../../server/test/database.mjs'

test(
  'sidebar chat streams Pi output, persists history, and scopes shared memory',
  { timeout: 120000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'noema-chat-'))
    const oldDir = process.env.NOEMA_DATA_DIR
    process.env.NOEMA_DATA_DIR = join(dir, 'server')
    let app
    t.after(async () => {
      await app?.close()
      if (oldDir) process.env.NOEMA_DATA_DIR = oldDir
      else delete process.env.NOEMA_DATA_DIR
      await rm(dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100
      })
    })
    const { prisma, url } = await testDatabase(t)
    const base = await testApp(t, url)
    const credentials = {
      email: 'chat@example.com',
      password: 'a-secure-test-password'
    }
    const http = async (method, path, body, token) => {
      const res = await fetch(base + path, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: 'Bearer ' + token } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      })
      assert.ok(res.ok, path + ' ' + res.status)
      return res.status === 204 ? null : res.json()
    }
    await http('POST', '/auth/register', credentials)
    const { accessToken } = await http('POST', '/auth/login', credentials)
    const cfg = {
      provider: 'openai-compatible',
      model: 'writer-test',
      systemPrompt: '你是创作助手。',
      thinkingLevel: 'medium',
      streaming: true
    }
    const project = await http(
      'POST',
      '/projects',
      { name: '海边故事' },
      accessToken
    )
    const second = await http(
      'POST',
      '/projects',
      { name: '独立项目' },
      accessToken
    )
    for (const p of [project, second])
      await http('PUT', '/projects/' + p.id + '/agent-config', cfg, accessToken)
    await http('PUT', '/chat-config', cfg, accessToken)
    await http(
      'PUT',
      '/model-credentials/openai-compatible',
      { baseUrl: 'https://gateway.example/v1', apiKey: 'sk-only-for-tests' },
      accessToken
    )
    const originalFetch = globalThis.fetch
    const payloads = []
    const gate = Promise.withResolvers()
    const buffered = Promise.withResolvers()
    const cancelled = Promise.withResolvers()
    let providerAborted = false
    t.after(() => {
      gate.resolve()
      buffered.resolve()
      cancelled.resolve()
    })
    t.mock.method(globalThis, 'fetch', async (input, options) => {
      const url = new URL(
        typeof input === 'string' ? input : (input.url ?? input)
      )
      if (url.origin === base) return originalFetch(input, options)
      assert.equal(url.href, 'https://gateway.example/v1/chat/completions')
      const body = JSON.parse(options.body)
      payloads.push(body)
      const i = payloads.length
      if (i === 8)
        return Response.json(
          { error: { message: 'untrusted private provider payload' } },
          { status: 429 }
        )
      if (i === 7)
        options.signal.addEventListener(
          'abort',
          () => {
            providerAborted = true
            cancelled.resolve()
          },
          { once: true }
        )
      const chunk = (fields, end = null) =>
        new TextEncoder().encode(
          'data: ' +
            JSON.stringify({
              id: 'test-run',
              choices: [{ index: 0, delta: fields, finish_reason: end }]
            }) +
            '\n\n'
        )
      const bodyStream = new ReadableStream({
        async start(c) {
          c.enqueue(chunk({ role: 'assistant', reasoning_content: '构思场景' }))
          c.enqueue(chunk({ content: '第一段' }))
          if (i === 1) await gate.promise
          if (i === 6) await buffered.promise
          if (i === 7) await cancelled.promise
          c.enqueue(chunk({ content: '回复' + i }, 'stop'))
          c.close()
        }
      })
      return new Response(bodyStream, {
        headers: { 'content-type': 'text/event-stream' }
      })
    })
    const cwd = resolve(import.meta.dirname, '..')
    const env = { ...process.env, NODE_ENV: 'production', NOEMA_API_URL: base }
    delete env.ELECTRON_RUN_AS_NODE
    delete env.ELECTRON_RENDERER_URL
    app = await electron.launch({
      executablePath: electronPath,
      args: [cwd, '--user-data-dir=' + join(dir, 'desktop')],
      env,
      cwd
    })
    const page = await app.firstWindow()
    page.setDefaultTimeout(8500)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 240))
    })
    const click = (name) =>
      page.getByRole('button', { name, exact: true }).click()
    const composer = page.getByRole('textbox', { name: '消息', exact: true })
    const choose = async (name) => {
      await page.getByRole('combobox', { name: '对话项目' }).click()
      await page.getByRole('option', { name, exact: true }).click()
    }
    const send = async (text) => {
      await composer.fill(text)
      await composer.press('Enter')
    }
    const completed = async (count) => {
      for (let i = 0; i < 60; i++) {
        if ((await prisma.chatMessage.count()) >= count) return
        await delay(70)
      }
      assert.fail('history did not persist')
    }
    try {
      await page.getByLabel('邮箱', { exact: true }).fill(credentials.email)
      await page.getByLabel('密码', { exact: true }).fill(credentials.password)
      await click('登录')
      await click('对话')
      await choose(project.name)
      await click('对话模型')
      await page.getByLabel('流式输出', { exact: true }).waitFor()
      assert.equal(
        await page.getByLabel('流式输出', { exact: true }).isChecked(),
        true
      )
      assert.match(
        await page.getByLabel('思考模式', { exact: true }).innerText(),
        /中/
      )
      await click('保存模型配置')
      await page.getByText('模型配置已保存。', { exact: true }).waitFor()
      await click('关闭')
      const open = page.waitForEvent('filechooser')
      await click('添加附件')
      await (
        await open
      ).setFiles({
        name: '故事.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('灯塔暗号')
      })
      await send('主角叫小满')
      await page.getByText('第一段', { exact: true }).waitFor()
      await page
        .getByTestId('assistant-avatar')
        .filter({ visible: true })
        .first()
        .waitFor()
      assert.equal(
        await page
          .getByTestId('assistant-avatar')
          .first()
          .getAttribute('data-pending'),
        'true'
      )
      assert.equal(payloads.length, 1)
      await page.getByText('思考', { exact: false }).first().waitFor()
      assert.equal(payloads[0].reasoning_effort, 'medium')
      assert.match(JSON.stringify(payloads[0].messages), /灯塔暗号/)
      gate.resolve()
      await page.getByText('第一段回复1', { exact: true }).waitFor()
      await completed(2)
      await click('新建对话')
      await send('同一个项目的主角是谁？')
      await page.getByText('第一段回复2', { exact: true }).waitFor()
      assert.match(JSON.stringify(payloads[1].messages), /主角叫小满/)
      await completed(4)
      await page.reload()
      await click('对话')
      await choose(project.name)
      await click('主角叫小满')
      await page.getByText('第一段回复1', { exact: true }).waitFor()
      await send('继续这个会话')
      await page.getByText('第一段回复3', { exact: true }).waitFor()
      assert.ok(
        payloads[2].messages.some(
          (m) =>
            m.role === 'assistant' &&
            JSON.stringify(m.content).includes('第一段回复1')
        )
      )
      await choose(second.name)
      await send('另一个项目')
      await page.getByText('第一段回复4', { exact: true }).waitFor()
      assert.doesNotMatch(JSON.stringify(payloads[3].messages), /小满|灯塔暗号/)
      await choose('独立对话')
      await send('独立聊天')
      await page.getByText('第一段回复5', { exact: true }).waitFor()
      assert.doesNotMatch(JSON.stringify(payloads[4].messages), /小满|灯塔暗号/)
      await http(
        'PUT',
        '/chat-config',
        { ...cfg, thinkingLevel: 'off', streaming: false },
        accessToken
      )
      await send('关闭流式')
      for (let i = 0; i < 60 && payloads.length < 6; i++) await delay(50)
      assert.equal(payloads.length, 6)
      assert.equal(payloads[5].reasoning_effort, undefined)
      assert.equal(await page.getByText('第一段', { exact: true }).count(), 0)
      buffered.resolve()
      await page.getByText('第一段回复6', { exact: true }).waitFor()
      await http('PUT', '/chat-config', cfg, accessToken)
      await send('中断测试')
      await page.getByText('第一段', { exact: true }).waitFor()
      await click('停止生成')
      for (let i = 0; i < 80 && !providerAborted; i++) await delay(50)
      assert.ok(providerAborted, 'desktop cancel must abort the upstream call')
      await send('限流测试')
      await page
        .getByText(/HTTP 429/)
        .first()
        .waitFor()
      assert.doesNotMatch(
        await page.locator('body').innerText(),
        /untrusted private/
      )
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setSize(390, 400)
      )
      await composer.waitFor()
      assert.ok(await composer.isVisible())
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      )
      assert.deepEqual(errors, [])
    } catch (error) {
      console.error(
        'Test window:',
        (await page.locator('body').innerText()).slice(-1600),
        errors
      )
      throw error
    } finally {
      gate.resolve()
      buffered.resolve()
      cancelled.resolve()
    }
  }
)

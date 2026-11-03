// Run build first. Verifies the real development renderer without a second browser download.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import electronPath from 'electron'
import { resolveConfig } from 'electron-vite'
import { createServer } from 'vite'
import { _electron as electron } from 'playwright-core'

const appDirectory = resolve(import.meta.dirname, '..')
const config = await resolveConfig({ root: appDirectory }, 'serve')
const server = await createServer(config.config.renderer)
let app
try {
  await server.listen()
  const environment = {
    ...process.env,
    NODE_ENV: 'development',
    ELECTRON_RENDERER_URL: 'http://127.0.0.1:5180'
  }
  delete environment.ELECTRON_RUN_AS_NODE
  app = await electron.launch({
    executablePath: electronPath,
    args: [appDirectory],
    cwd: appDirectory,
    env: environment,
    timeout: 30_000
  })
  const page = await app.firstWindow()
  page.setDefaultTimeout(10_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (/content security policy|violates.*directive/i.test(message.text()))
      errors.push(message.text())
  })
  await page.getByRole('heading', { name: '个人短剧创作工具' }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: '个人短剧创作工具' }).waitFor()
  assert.equal(new URL(page.url()).origin, 'http://127.0.0.1:5180')
  await page.evaluate(async () => {
    const { createHotContext } = await import('/@vite/client')
    createHotContext('/smoke').on('smoke:ping', () => {
      globalThis.hmrReceived = true
    })
  })
  server.ws.send({ type: 'custom', event: 'smoke:ping', data: {} })
  await page.waitForFunction(() => globalThis.hmrReceived === true)
  const reloaded = page.waitForEvent('domcontentloaded')
  server.ws.send({ type: 'full-reload' })
  await reloaded
  await page.getByRole('heading', { name: '个人短剧创作工具' }).waitFor()
  assert.deepEqual(errors, [])

  const initialUrl = page.url()
  await app.evaluate(({ BrowserWindow }) => {
    globalThis.smokeNavigationBlocked = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5_000)
      BrowserWindow.getAllWindows()[0].webContents.once(
        'will-frame-navigate',
        (event) => {
          clearTimeout(timer)
          resolve(event.defaultPrevented)
        }
      )
    })
  })
  await page.evaluate(() => {
    location.href = '/blocked-smoke'
  })
  assert.equal(
    await app.evaluate(() => globalThis.smokeNavigationBlocked),
    true
  )
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.getURL()
    ),
    initialUrl
  )
  console.log(
    'PASS: real Electron development renderer, CSP, HMR socket, full reload and navigation restrictions'
  )
} finally {
  if (app) await app.close()
  await server.close()
}

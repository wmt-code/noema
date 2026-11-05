// Run build first. Uses the installed Electron binary; no browser download required.
import assert from 'node:assert/strict'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import electronPath from 'electron'
import { _electron as electron } from 'playwright-core'

const appDirectory = resolve(import.meta.dirname, '..')
await access(join(appDirectory, 'out/main/index.js'))
const environment = { ...process.env, NODE_ENV: 'production' }
delete environment['ELECTRON_RUN_AS_NODE']
delete environment['ELECTRON_RENDERER_URL']

const userData = await mkdtemp(join(tmpdir(), 'noema-smoke-'))
const app = await electron.launch({
  executablePath: electronPath,
  args: [appDirectory, `--user-data-dir=${userData}`],
  cwd: appDirectory,
  env: environment,
  timeout: 30_000
})

try {
  const page = await app.firstWindow()
  page.setDefaultTimeout(10_000)
  const rendererErrors = []
  const cspErrors = []
  page.on('pageerror', (error) => rendererErrors.push(error.message))
  page.on('console', (message) => {
    if (/content security policy|violates.*directive/i.test(message.text()))
      cspErrors.push(message.text())
  })
  await page.getByRole('heading', { name: '登录 Noema' }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: '登录 Noema' }).waitFor()
  await page.getByRole('button', { name: '注册账号', exact: true }).click()
  await page.getByRole('heading', { name: '注册 Noema' }).waitFor()
  await page.getByRole('button', { name: '返回登录' }).click()
  await page.getByRole('heading', { name: '登录 Noema' }).waitFor()
  assert.equal(
    await page
      .locator('.auth-art')
      .evaluate((image) => image.complete && image.naturalWidth > 0),
    true
  )
  assert.equal(
    await page
      .locator('.brand-mark')
      .evaluate((image) => image.complete && image.naturalWidth > 0),
    true
  )
  assert.equal(
    await page.locator('link[rel="icon"]').getAttribute('href'),
    './brand/favicon.ico'
  )
  assert.deepEqual(cspErrors, [])
  assert.equal(await page.title(), 'Noema')
  assert.equal(new URL(page.url()).protocol, 'file:')
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN')

  const security = await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    const preferences = window.webContents.getLastWebPreferences()
    return {
      visible: window.isVisible(),
      contextIsolation: preferences.contextIsolation,
      sandbox: preferences.sandbox,
      nodeIntegration: preferences.nodeIntegration
    }
  })
  assert.deepEqual(security, {
    visible: true,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false
  })
  assert.deepEqual(
    await page.evaluate(() => ({
      node: typeof globalThis.process,
      require: typeof globalThis.require,
      bridge: typeof window.noema?.request
    })),
    { node: 'undefined', require: 'undefined', bridge: 'function' }
  )
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  assert.ok(csp?.includes("connect-src 'none'"))
  assert.ok(
    !csp.includes('unsafe-eval') &&
      !csp.includes('http:') &&
      !csp.includes('ws:') &&
      csp.includes("script-src 'self';") &&
      csp.includes("style-src 'self' 'unsafe-inline';")
  )

  await page.evaluate(() => {
    const script = document.createElement('script')
    script.textContent = 'globalThis.inlineScriptExecuted = true'
    document.head.append(script)
  })
  assert.equal(
    await page.evaluate(() => globalThis.inlineScriptExecuted),
    undefined
  )
  assert.equal(
    await page.evaluate(() => window.open('about:blank') === null),
    true
  )
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length
    ),
    1
  )

  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 760 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    )
  }
  for (const [width, height] of [
    [1440, 1024],
    [1487, 1058],
    [1280, 820],
    [390, 820],
    [1024, 400]
  ]) {
    await page.setViewportSize({ width, height })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    )
    assert.equal(await page.locator('.auth-art').isVisible(), width >= 768)
    await page.screenshot({
      path: join(appDirectory, `out/login-${width}-${height}.png`),
      fullPage: true
    })
  }
  await page.setViewportSize({ width: 1120, height: 760 })
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(255, 255, 255)'
  )
  const screenshot = join(appDirectory, 'out/smoke.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  assert.deepEqual(rendererErrors, [])

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
    location.href = 'http://127.0.0.1:5180/blocked-smoke'
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
    `PASS: real Electron renderer, sandbox, CSP, navigation and popup restrictions; screenshot: ${screenshot}`
  )
} finally {
  await app.close()
  await rm(userData, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200
  })
}

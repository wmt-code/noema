// Run build first. Uses the installed Electron binary; no browser download required.
import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import electronPath from 'electron'
import { _electron as electron } from 'playwright-core'

const appDirectory = resolve(import.meta.dirname, '..')
await access(join(appDirectory, 'out/main/index.js'))
const environment = { ...process.env, NODE_ENV: 'production' }
delete environment['ELECTRON_RUN_AS_NODE']
delete environment['ELECTRON_RENDERER_URL']

const app = await electron.launch({
  executablePath: electronPath,
  args: [appDirectory],
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
    if (/content security policy|violates.*directive/i.test(message.text())) cspErrors.push(message.text())
  })
  await page.reload()
  await page.getByRole('heading', { name: '个人短剧创作工具' }).waitFor()
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
      nodeIntegration: preferences.nodeIntegration,
      preload: preferences.preload ?? ''
    }
  })
  assert.deepEqual(security, {
    visible: true,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    preload: ''
  })
  assert.deepEqual(await page.evaluate(() => ({
    node: typeof globalThis.process,
    require: typeof globalThis.require
  })), { node: 'undefined', require: 'undefined' })
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  assert.ok(csp?.includes("connect-src 'none'"))
  assert.ok(!csp.includes('unsafe-') && !csp.includes('http:') && !csp.includes('ws:'))

  await page.evaluate(() => {
    const script = document.createElement('script')
    script.textContent = 'globalThis.inlineScriptExecuted = true'
    document.head.append(script)
  })
  assert.equal(await page.evaluate(() => globalThis.inlineScriptExecuted), undefined)
  assert.equal(await page.evaluate(() => window.open('about:blank') === null), true)
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1)

  const navigationBlocked = app.evaluate(({ BrowserWindow }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Navigation event did not fire')), 5_000)
    BrowserWindow.getAllWindows()[0].webContents.once('will-frame-navigate', (event) => {
      clearTimeout(timer)
      resolve(event.defaultPrevented)
    })
  }))
  await page.evaluate(() => { location.href = 'about:blank' })
  assert.equal(await navigationBlocked, true)
  await page.getByRole('heading', { name: '个人短剧创作工具' }).waitFor()

  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 760 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  }
  await page.setViewportSize({ width: 1120, height: 760 })
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(241, 244, 247)')
  const screenshot = join(appDirectory, 'out/smoke.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  assert.deepEqual(rendererErrors, [])
  console.log(`PASS: real Electron renderer, sandbox, CSP, navigation and popup restrictions; screenshot: ${screenshot}`)
} finally {
  await app.close()
}

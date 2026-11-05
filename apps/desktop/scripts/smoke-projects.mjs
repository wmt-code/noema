// Build server and desktop first; from apps/desktop run:
// node --env-file-if-exists=../../.env --test scripts/smoke-projects.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import electronPath from 'electron'
import { _electron as electron } from 'playwright-core'
import { testApp, testDatabase } from '../../server/test/database.mjs'

const appDirectory = resolve(import.meta.dirname, '..')
const email = 'desktop-smoke@example.com'
const password = 'a-very-secure-passphrase'
const projectName = '星河故事'
const renamedProject = '星河故事 · 第一季'
const firstTitle = '第一集 · 初见'
const editedTitle = '第一集 · 重逢'
const secondTitle = '第二集 · 回声'

test(
  'real desktop project management, persistence and encrypted sessions',
  {
    timeout: 180_000
  },
  async (t) => {
    await access(join(appDirectory, 'out/main/index.js'))
    const userData = await mkdtemp(join(tmpdir(), 'noema-projects-'))
    const sessionFile = join(userData, 'session.bin')
    let app
    let stopBackend
    t.after(async () => {
      try {
        await app?.close()
      } finally {
        await rm(userData, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100
        })
      }
    })
    t.after(() => stopBackend?.())
    const { prisma, url } = await testDatabase(t)
    // Retain the helper's close hook so the same schema can survive a backend restart.
    const backendContext = {
      after(close) {
        stopBackend = close
      }
    }
    const base = await testApp(backendContext, url)
    const errors = []

    async function launch() {
      const env = {
        ...process.env,
        NODE_ENV: 'production',
        NOEMA_API_URL: base
      }
      delete env.ELECTRON_RUN_AS_NODE
      delete env.ELECTRON_RENDERER_URL
      app = await electron.launch({
        executablePath: electronPath,
        args: [appDirectory, `--user-data-dir=${userData}`],
        cwd: appDirectory,
        env,
        timeout: 30_000
      })
      const page = await app.firstWindow()
      page.setDefaultTimeout(10_000)
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (/content security policy|violates.*directive/i.test(message.text()))
          errors.push(message.text())
      })
      assert.equal(
        await app.evaluate(({ app }) => app.getPath('userData')),
        userData
      )
      assert.equal(
        await page.evaluate(() => typeof window.noema?.request),
        'function'
      )
      return page
    }

    const send = (method, path, token, body) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
      })
    let page = await launch()
    const main = () => page.getByRole('main')
    const row = (title) =>
      page.getByTestId('episode-row').filter({
        has: page.getByRole('button', { name: title, exact: true })
      })
    async function chooseFilter(label, option) {
      const trigger = main().getByRole('combobox', { name: label, exact: true })
      const before = await trigger.boundingBox()
      await trigger.click()
      await page.getByRole('option', { name: option, exact: true }).click()
      assert.equal(await trigger.textContent(), option)
      const after = await trigger.boundingBox()
      assert.equal(before.width, after.width)
      assert.equal(await trigger.getAttribute('data-slot'), 'select-trigger')
    }
    async function menu(name, action) {
      await main()
        .getByRole('button', { name: `${name} 的操作`, exact: true })
        .click()
      await page.getByRole('menuitem', { name: action, exact: true }).click()
    }

    await page
      .getByRole('heading', { name: '登录 Noema', exact: true })
      .waitFor()
    await page.getByRole('button', { name: '注册账号', exact: true }).click()
    await page.getByLabel('邮箱', { exact: true }).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByRole('button', { name: '注册并登录', exact: true }).click()
    await main()
      .getByRole('heading', { name: '我的项目', exact: true })
      .waitFor()
    await main()
      .getByRole('heading', { name: '还没有项目', exact: true })
      .waitFor()
    assert.equal(
      await main()
        .getByRole('button', { name: '新建项目', exact: true })
        .count(),
      1
    )
    await chooseFilter('项目排序', '项目名称')
    await chooseFilter('项目排序', '最近更新')
    const sortTrigger = main().getByRole('combobox', { name: '项目排序' })
    await sortTrigger.focus()
    await page.keyboard.press('ArrowDown')
    await page.getByRole('option', { name: '最近更新', exact: true }).waitFor()
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('role') === 'option'
    )
    await page.keyboard.press('End')
    await page.waitForFunction(
      () => document.activeElement?.textContent === '项目名称'
    )
    await page.keyboard.press('Enter')
    await page.getByRole('listbox').waitFor({ state: 'hidden' })
    assert.equal(await sortTrigger.textContent(), '项目名称')
    assert.equal(
      await sortTrigger.evaluate(
        (element) => element === document.activeElement
      ),
      true
    )
    await main().getByRole('combobox', { name: '项目排序' }).click()
    await page
      .locator('[data-slot="select-content"]')
      .evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished)
        )
      )
    await page.screenshot({ path: join(appDirectory, 'out/sort-menu.png') })
    await page.keyboard.press('Escape')
    const owner = await prisma.user.findUniqueOrThrow({ where: { email } })
    assert.equal(
      await app.evaluate(({ safeStorage }) =>
        safeStorage.isEncryptionAvailable()
      ),
      true
    )
    const encrypted = await readFile(sessionFile)
    const saved = await app.evaluate(
      ({ safeStorage }, bytes) =>
        JSON.parse(safeStorage.decryptString(Buffer.from(bytes))),
      [...encrypted]
    )
    assert.equal(saved.origin, base)
    const token = saved.token
    assert.match(token, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(
      encrypted.includes(Buffer.from(token)),
      false,
      'session must not contain a plaintext token'
    )
    const tokenHash = createHash('sha256').update(token).digest('hex')
    assert.equal(
      (await prisma.session.findUniqueOrThrow({ where: { tokenHash } })).userId,
      owner.id
    )
    assert.equal((await send('GET', '/projects')).status, 401)
    assert.equal((await send('GET', '/projects', 'x'.repeat(43))).status, 401)
    assert.equal(
      (await send('POST', '/projects', token, { name: '   ' })).status,
      400
    )
    assert.equal(await prisma.project.count(), 0)

    await main()
      .getByRole('button', { name: '新建项目', exact: true })
      .first()
      .click()
    let dialog = page.getByRole('dialog', { name: '新建项目', exact: true })
    await dialog.getByLabel('项目名称', { exact: true }).fill(projectName)
    await dialog.getByRole('button', { name: '创建项目', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await main()
      .getByRole('button', { name: projectName, exact: true })
      .waitFor()
    await page
      .locator('[data-slot="dialog-overlay"]')
      .waitFor({ state: 'detached' })
    await page.screenshot({
      path: join(appDirectory, 'out/project-list.png'),
      fullPage: true
    })
    const project = await prisma.project.findFirstOrThrow({
      where: { ownerId: owner.id }
    })
    assert.equal(project.name, projectName)
    await main()
      .getByLabel('搜索项目', { exact: true })
      .fill('不存在的搜索结果')
    await main()
      .getByRole('heading', { name: '没有找到项目', exact: true })
      .waitFor()
    assert.equal(
      await main()
        .getByRole('button', { name: projectName, exact: true })
        .count(),
      0
    )
    await main().getByRole('button', { name: '清除搜索', exact: true }).click()

    await menu(projectName, '重命名')
    dialog = page.getByRole('dialog', { name: '重命名项目', exact: true })
    await dialog.getByLabel('项目名称', { exact: true }).fill(renamedProject)
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await main()
      .getByRole('button', { name: renamedProject, exact: true })
      .click()
    await main()
      .getByRole('heading', { name: renamedProject, exact: true })
      .waitFor()
    await main()
      .getByRole('heading', { name: '还没有剧集', exact: true })
      .waitFor()
    assert.equal(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .name,
      renamedProject
    )

    for (const [title, status] of [
      [firstTitle, '制作中'],
      [secondTitle, '草稿']
    ]) {
      await main()
        .getByRole('button', { name: '新建剧集', exact: true })
        .first()
        .click()
      dialog = page.getByRole('dialog', { name: '新建剧集', exact: true })
      await dialog.getByLabel('剧集名称', { exact: true }).fill(title)
      await dialog.getByRole('combobox', { name: '状态', exact: true }).click()
      await page.getByRole('option', { name: status, exact: true }).click()
      await dialog
        .getByRole('button', { name: '创建剧集', exact: true })
        .click()
      await dialog.waitFor({ state: 'hidden' })
      await row(title)
        .getByText(status, { exact: true })
        .filter({ visible: true })
        .waitFor()
    }
    const episode = await prisma.episode.findFirstOrThrow({
      where: { projectId: project.id, title: firstTitle }
    })
    assert.equal(episode.status, 'IN_PROGRESS')
    await menu(firstTitle, '编辑剧集')
    dialog = page.getByRole('dialog', { name: '编辑剧集', exact: true })
    await dialog.getByLabel('剧集名称', { exact: true }).fill(editedTitle)
    await dialog.getByRole('combobox', { name: '状态', exact: true }).click()
    await page.getByRole('option', { name: '已完成', exact: true }).click()
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await row(editedTitle)
      .getByText('已完成', { exact: true })
      .filter({ visible: true })
      .waitFor()
    const updatedEpisode = await prisma.episode.findUniqueOrThrow({
      where: { id: episode.id }
    })
    assert.equal(updatedEpisode.title, editedTitle)
    assert.equal(updatedEpisode.status, 'COMPLETED')
    await main()
      .getByLabel('搜索剧集', { exact: true })
      .fill('不存在的搜索结果')
    await main()
      .getByRole('heading', { name: '没有找到剧集', exact: true })
      .waitFor()
    await main().getByRole('button', { name: '清除筛选', exact: true }).click()
    await chooseFilter('筛选状态', '草稿')
    await row(secondTitle).waitFor()
    assert.equal(await row(editedTitle).count(), 0)
    await chooseFilter('筛选状态', '全部状态')
    await row(editedTitle).waitFor()
    for (const status of ['草稿', '制作中', '已完成', '全部状态']) {
      await chooseFilter('筛选状态', status)
    }
    const extraProjects = await Promise.all(
      [
        '雨停之前',
        '末班列车',
        '失物招领处',
        '隔岸来信：一个关于重逢、远行与未寄出信件的故事'
      ].map((name) =>
        prisma.project.create({ data: { name, ownerId: owner.id } })
      )
    )
    await main().getByRole('button', { name: '所有项目', exact: true }).click()
    await main().getByRole('button', { name: '刷新列表' }).click()
    await main().getByText('5 个项目', { exact: true }).waitFor()
    await main().getByRole('button', { name: '刷新列表' }).focus()
    await page.screenshot({
      path: join(appDirectory, 'out/project-list.png'),
      fullPage: true
    })
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1487, 1058)
    )
    await page.waitForFunction(() => innerWidth === 1487)
    await page.screenshot({
      path: join(appDirectory, 'out/workspace-native.png'),
      fullPage: true
    })
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(390, 820)
    )
    await page.waitForFunction(() => innerWidth === 390)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true,
      'Project names and actions must fit a narrow window'
    )
    await page.screenshot({
      path: join(appDirectory, 'out/project-list-narrow.png'),
      fullPage: true
    })
    const navigationButton = page.getByRole('button', { name: '打开导航' })
    await navigationButton.click()
    const navigation = page.getByRole('dialog', { name: '工作台导航' })
    await navigation.waitFor()
    await navigation.evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    )
    assert.equal(
      await navigation.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= innerWidth &&
          r.bottom <= innerHeight
        )
      }),
      true
    )
    assert.equal(
      await navigation
        .getByRole('button', { name: '退出登录', exact: true })
        .isVisible(),
      true
    )
    await page.screenshot({
      path: join(appDirectory, 'out/navigation-narrow.png')
    })
    await page.keyboard.press('Escape')
    await navigation.waitFor({ state: 'hidden' })
    assert.equal(
      await navigationButton.evaluate(
        (button) => button === document.activeElement
      ),
      true
    )
    await navigationButton.click()
    await navigation.getByRole('button', { name: '项目', exact: true }).click()
    await navigation.waitFor({ state: 'hidden' })
    await navigationButton.click()
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1280, 820)
    )
    await page.waitForFunction(() => innerWidth === 1280)
    await navigation.waitFor({ state: 'hidden' })
    await main()
      .getByRole('button', { name: renamedProject, exact: true })
      .click()
    await row(editedTitle).waitFor()
    // Check the native window, including the shortest supported desktop height.
    for (const height of [760, 600, 400]) {
      await app.evaluate(({ BrowserWindow }, height) => {
        BrowserWindow.getAllWindows()[0].setContentSize(1024, height)
      }, height)
      await page.waitForFunction((height) => innerHeight === height, height)
      const bounds = await page
        .getByRole('button', { name: '退出登录', exact: true })
        .evaluate((button) => {
          const rect = button.getBoundingClientRect()
          return { top: rect.top, bottom: rect.bottom, viewport: innerHeight }
        })
      assert.equal(
        await page
          .locator('[data-slot="sidebar-content"]')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
        true,
        'Recent projects must not scroll horizontally'
      )
      await page.screenshot({
        path: join(appDirectory, `out/layout-${height}.png`)
      })
      assert.ok(
        bounds.top >= 0 && bounds.bottom <= bounds.viewport,
        `Logout is clipped at height ${height}: ${JSON.stringify(bounds)}`
      )
    }
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1280, 820)
    )
    await page.waitForFunction(() => innerHeight === 820)
    const screenshot = join(appDirectory, 'out/projects.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    await page.setViewportSize({ width: 390, height: 820 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    )
    await row(editedTitle).waitFor()
    await page.screenshot({
      path: join(appDirectory, 'out/projects-narrow.png'),
      fullPage: true
    })
    await page.setViewportSize({ width: 1280, height: 820 })

    await prisma.project.deleteMany({
      where: { id: { in: extraProjects.map(({ id }) => id) } }
    })
    await stopBackend()
    stopBackend = undefined
    await main()
      .getByRole('button', { name: '新建剧集', exact: true })
      .first()
      .click()
    dialog = page.getByRole('dialog', { name: '新建剧集', exact: true })
    await dialog
      .getByLabel('剧集名称', { exact: true })
      .fill('网络中断时不能保存')
    await dialog.getByRole('button', { name: '创建剧集', exact: true }).click()
    await dialog
      .getByRole('alert')
      .getByText('无法连接服务，请确认服务已启动后重试。', { exact: true })
      .waitFor()
    assert.equal(await dialog.isVisible(), true)
    assert.equal(
      await prisma.episode.count({ where: { projectId: project.id } }),
      2
    )
    assert.equal(await row('网络中断时不能保存').count(), 0)
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await app.close()
    app = undefined

    const serverRequire = createRequire(
      new URL('../../server/package.json', import.meta.url)
    )
    const { NestFactory } = serverRequire('@nestjs/core')
    const { AppModule } = await import('../../server/dist/app.module.js')
    const restartedBackend = await NestFactory.create(AppModule, {
      logger: false
    })
    stopBackend = () => restartedBackend.close()
    await restartedBackend.listen(Number(new URL(base).port), '127.0.0.1')
    assert.equal(await restartedBackend.getUrl(), base)
    page = await launch()
    await main()
      .getByRole('heading', { name: '我的项目', exact: true })
      .waitFor()
    await main()
      .getByRole('button', { name: renamedProject, exact: true })
      .click()
    await main()
      .getByRole('heading', { name: renamedProject, exact: true })
      .waitFor()
    await row(editedTitle)
      .getByText('已完成', { exact: true })
      .filter({ visible: true })
      .waitFor()
    await row(secondTitle)
      .getByText('草稿', { exact: true })
      .filter({ visible: true })
      .waitFor()
    assert.deepEqual(await readFile(sessionFile), encrypted)
    assert.equal(await prisma.session.count({ where: { userId: owner.id } }), 1)
    assert.equal((await send('GET', '/auth/me', token)).status, 200)
    const persisted = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { episodes: true }
    })
    assert.equal(persisted.name, renamedProject)
    assert.deepEqual(
      persisted.episodes.map(({ title, status }) => [title, status]).sort(),
      [
        [editedTitle, 'COMPLETED'],
        [secondTitle, 'DRAFT']
      ].sort()
    )

    await menu(editedTitle, '删除剧集')
    dialog = page.getByRole('alertdialog', {
      name: '确认删除剧集',
      exact: true
    })
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await row(editedTitle).waitFor()
    assert.equal(await prisma.episode.count({ where: { id: episode.id } }), 1)
    await menu(editedTitle, '删除剧集')
    dialog = page.getByRole('alertdialog', {
      name: '确认删除剧集',
      exact: true
    })
    await dialog.getByRole('button', { name: '删除', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await row(editedTitle).waitFor({ state: 'detached' })
    assert.equal(await prisma.episode.count({ where: { id: episode.id } }), 0)

    await menu(renamedProject, '删除项目')
    dialog = page.getByRole('alertdialog', {
      name: '确认删除项目',
      exact: true
    })
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await main()
      .getByRole('heading', { name: renamedProject, exact: true })
      .waitFor()
    assert.equal(await prisma.project.count({ where: { id: project.id } }), 1)
    await menu(renamedProject, '删除项目')
    dialog = page.getByRole('alertdialog', {
      name: '确认删除项目',
      exact: true
    })
    await dialog.getByRole('button', { name: '删除', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await main()
      .getByRole('heading', { name: '我的项目', exact: true })
      .waitFor()
    await main()
      .getByRole('heading', { name: '还没有项目', exact: true })
      .waitFor()
    assert.equal(await prisma.project.count({ where: { id: project.id } }), 0)
    assert.equal(
      await prisma.episode.count({ where: { projectId: project.id } }),
      0
    )

    await page.getByRole('button', { name: '退出登录', exact: true }).click()
    await page
      .getByRole('heading', { name: '登录 Noema', exact: true })
      .waitFor()
    await assert.rejects(access(sessionFile), { code: 'ENOENT' })
    assert.equal(await prisma.session.count({ where: { userId: owner.id } }), 0)
    assert.equal((await send('GET', '/auth/me', token)).status, 401)
    await app.close()
    app = undefined
    page = await launch()
    await page
      .getByRole('heading', { name: '登录 Noema', exact: true })
      .waitFor()
    await assert.rejects(access(sessionFile), { code: 'ENOENT' })
    await page.getByLabel('邮箱', { exact: true }).fill(email)
    await page
      .getByLabel('密码', { exact: true })
      .fill('an-incorrect-passphrase')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await page
      .getByRole('alert')
      .getByText('邮箱或密码不正确。', { exact: true })
      .waitFor()
    assert.equal(
      await main()
        .getByRole('heading', { name: '我的项目', exact: true })
        .count(),
      0
    )
    await assert.rejects(access(sessionFile), { code: 'ENOENT' })
    assert.deepEqual(
      errors,
      [],
      'renderer must have no page errors or CSP violations'
    )
    t.diagnostic(`Populated workspace screenshot: ${screenshot}`)
  }
)

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { testApp, testDatabase } from './database.mjs'

const PASSWORD = 'a-very-secure-passphrase'
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/

test('project and episode management API', { timeout: 60000 }, async (t) => {
  const { prisma, url } = await testDatabase(t)
  const base = await testApp(t, url)

  const send = (method, path, token, body) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    })

  const registerAndLogin = async (email) => {
    const created = await send('POST', '/auth/register', undefined, {
      email,
      password: PASSWORD
    })
    assert.equal(created.status, 201)
    const login = await send('POST', '/auth/login', undefined, {
      email,
      password: PASSWORD
    })
    assert.equal(login.status, 200)
    return (await login.json()).accessToken
  }

  const owner = await registerAndLogin('owner@example.com')
  const intruder = await registerAndLogin('intruder@example.com')

  await t.test('project input is validated', async () => {
    for (const body of [
      undefined,
      { name: '   ' },
      { name: '长'.repeat(81) },
      { name: '项目', settings: 'no' },
      { name: '项目', extra: 1 },
      { title: '错误的字段' }
    ]) {
      const response = await send('POST', '/projects', owner, body)
      assert.equal(response.status, 400, JSON.stringify(body))
    }
  })

  let projectA
  let projectB
  await t.test('projects support CRUD scoped to their owner', async () => {
    const first = await send('POST', '/projects', owner, { name: '项目A' })
    assert.equal(first.status, 201)
    projectA = await first.json()
    assert.match(projectA.id, UUID)
    assert.deepEqual(projectA.settings, {})
    assert.ok(new Date(projectA.createdAt) <= new Date(projectA.updatedAt))

    const second = await send('POST', '/projects', owner, {
      name: '项目B',
      settings: { theme: 'dark' }
    })
    assert.equal(second.status, 201)
    projectB = await second.json()

    const list = await send('GET', '/projects', owner)
    assert.equal(list.status, 200)
    assert.deepEqual(
      (await list.json()).map((item) => item.id),
      [projectB.id, projectA.id]
    )

    const got = await send('GET', `/projects/${projectA.id}`, owner)
    assert.equal(got.status, 200)
    assert.deepEqual(await got.json(), projectA)

    const patched = await send('PATCH', `/projects/${projectB.id}`, owner, {
      name: '项目B改',
      settings: { theme: 'light' }
    })
    assert.equal(patched.status, 200)
    const updated = await patched.json()
    assert.equal(updated.name, '项目B改')
    assert.deepEqual(updated.settings, { theme: 'light' })
    assert.ok(new Date(updated.updatedAt) > new Date(projectB.updatedAt))

    const nameOnly = await send('PATCH', `/projects/${projectB.id}`, owner, {
      name: '  项目B  '
    })
    assert.equal((await nameOnly.json()).name, '项目B')
    assert.equal(
      (await send('PATCH', `/projects/${projectA.id}`, owner, {})).status,
      400
    )
    assert.equal((await send('GET', '/projects/not-a-uuid', owner)).status, 400)
  })

  let episode
  await t.test('episodes support CRUD under their project', async () => {
    const first = await send(
      'POST',
      `/projects/${projectA.id}/episodes`,
      owner,
      {
        title: '第一集'
      }
    )
    assert.equal(first.status, 201)
    episode = await first.json()
    assert.equal(episode.status, 'DRAFT')

    const second = await send(
      'POST',
      `/projects/${projectA.id}/episodes`,
      owner,
      {
        title: '第二集',
        status: 'COMPLETED'
      }
    )
    assert.equal(second.status, 201)
    const completed = await second.json()
    assert.equal(completed.status, 'COMPLETED')

    for (const body of [
      { status: 'DRAFT' },
      { title: '   ' },
      { title: '一'.repeat(201) },
      { title: '第三集', status: 'NOPE' }
    ]) {
      const response = await send(
        'POST',
        `/projects/${projectA.id}/episodes`,
        owner,
        body
      )
      assert.equal(response.status, 400, JSON.stringify(body))
    }

    const list = await send('GET', `/projects/${projectA.id}/episodes`, owner)
    assert.equal(list.status, 200)
    assert.deepEqual(
      (await list.json()).map((item) => item.id),
      [episode.id, completed.id]
    )

    const patched = await send('PATCH', `/episodes/${episode.id}`, owner, {
      title: '第一集改',
      status: 'IN_PROGRESS'
    })
    assert.equal(patched.status, 200)
    const updated = await patched.json()
    assert.equal(updated.title, '第一集改')
    assert.equal(updated.status, 'IN_PROGRESS')

    assert.equal(
      (
        await send('PATCH', `/episodes/${episode.id}`, owner, {
          status: 'NOPE'
        })
      ).status,
      400
    )
    assert.equal(
      (await send('PATCH', `/episodes/${episode.id}`, owner, {})).status,
      400
    )

    const got = await send('GET', `/episodes/${completed.id}`, owner)
    assert.equal(got.status, 200)
    assert.deepEqual(await got.json(), completed)

    assert.equal(
      (await send('DELETE', `/episodes/${completed.id}`, owner)).status,
      204
    )
    assert.equal(
      (await send('GET', `/episodes/${completed.id}`, owner)).status,
      404
    )
    assert.equal(
      (await send('DELETE', `/episodes/${completed.id}`, owner)).status,
      404
    )
  })

  await t.test('another user gets 404 for foreign resources', async () => {
    const intruderList = await send('GET', '/projects', intruder)
    assert.deepEqual(await intruderList.json(), [])
    assert.equal(
      (await send('GET', `/projects/${projectA.id}`, intruder)).status,
      404
    )
    assert.equal(
      (
        await send('PATCH', `/projects/${projectA.id}`, intruder, {
          name: '劫持'
        })
      ).status,
      404
    )
    assert.equal(
      (await send('DELETE', `/projects/${projectA.id}`, intruder)).status,
      404
    )
    assert.equal(
      (await send('GET', `/projects/${projectA.id}/episodes`, intruder)).status,
      404
    )
    assert.equal(
      (
        await send('POST', `/projects/${projectA.id}/episodes`, intruder, {
          title: '劫持'
        })
      ).status,
      404
    )
    assert.equal(
      (await send('GET', `/episodes/${episode.id}`, intruder)).status,
      404
    )
    assert.equal(
      (
        await send('PATCH', `/episodes/${episode.id}`, intruder, {
          title: '劫持'
        })
      ).status,
      404
    )
  })

  await t.test(
    'project deletion cascades episodes and other data persists',
    async () => {
      const removed = await send('DELETE', `/projects/${projectA.id}`, owner)
      assert.equal(removed.status, 204)
      assert.equal(
        (await send('GET', `/projects/${projectA.id}`, owner)).status,
        404
      )
      assert.equal(
        await prisma.episode.count({ where: { projectId: projectA.id } }),
        0
      )

      const kept = await send('GET', `/projects/${projectB.id}`, owner)
      assert.equal(kept.status, 200)
      assert.equal((await kept.json()).name, '项目B')

      const list = await send('GET', '/projects', owner)
      assert.deepEqual(
        (await list.json()).map((item) => item.id),
        [projectB.id]
      )
      assert.equal(
        (await fetch(`${base}/projects`, { signal: AbortSignal.timeout(5000) }))
          .status,
        401
      )
    }
  )
})

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { OwnershipService } from '../dist/ownership.service.js'
import { testApp, testDatabase } from './database.mjs'

const PASSWORD = 'a-very-secure-passphrase'

test(
  'auth endpoints, sessions and ownership checks',
  { timeout: 60000 },
  async (t) => {
    const { prisma, url } = await testDatabase(t)
    const base = await testApp(t, url)
    const bearer = (token) => ({ authorization: `Bearer ${token}` })
    const post = (path, body, headers = {}) =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
      })
    const get = (path, headers = {}) =>
      fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(5000) })

    let user
    let token

    await t.test(
      'register validates input, normalizes email and rejects duplicates',
      async () => {
        const created = await post('/auth/register', {
          email: 'owner@example.com',
          password: PASSWORD
        })
        assert.equal(created.status, 201)
        user = await created.json()
        assert.match(user.id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
        assert.deepEqual(user, { id: user.id, email: 'owner@example.com' })

        assert.equal(
          (
            await post('/auth/register', {
              email: 'owner@example.com',
              password: PASSWORD
            })
          ).status,
          409
        )
        assert.equal(
          (
            await post('/auth/register', {
              email: 'owner@example.com',
              password: 'short'
            })
          ).status,
          400
        )
      }
    )

    await t.test(
      'login issues a bearer session and rejects bad credentials',
      async () => {
        const ok = await post('/auth/login', {
          email: 'OWNER@example.com',
          password: PASSWORD
        })
        assert.equal(ok.status, 200)
        const session = await ok.json()
        token = session.accessToken
        assert.match(token, /^[A-Za-z0-9_-]{43}$/)
        assert.equal(session.tokenType, 'Bearer')
        assert.deepEqual(session.user, {
          id: user.id,
          email: 'owner@example.com'
        })
        assert.ok(new Date(session.expiresAt) > new Date())

        assert.equal(
          (
            await post('/auth/login', {
              email: 'owner@example.com',
              password: 'a-wrong-passphrase'
            })
          ).status,
          401
        )
        assert.equal(
          (
            await post('/auth/login', {
              email: 'nobody@example.com',
              password: PASSWORD
            })
          ).status,
          401
        )
      }
    )

    await t.test(
      'protected routes reject missing, malformed or unknown tokens',
      async () => {
        assert.equal((await get('/auth/me')).status, 401)
        assert.equal(
          (await get('/auth/me', { authorization: 'Basic abc' })).status,
          401
        )
        assert.equal(
          (await get('/auth/me', bearer('x'.repeat(43)))).status,
          401
        )
        assert.equal(
          (await get('/auth/me', bearer('x'.repeat(42)))).status,
          401
        )
        assert.equal((await post('/auth/logout')).status, 401)
      }
    )

    await t.test(
      'me and logout round-trip and expired sessions are rejected',
      async () => {
        const me = await get('/auth/me', bearer(token))
        assert.equal(me.status, 200)
        assert.deepEqual(await me.json(), {
          id: user.id,
          email: 'owner@example.com'
        })

        const expired = 'e'.repeat(43)
        await prisma.session.create({
          data: {
            userId: user.id,
            tokenHash: createHash('sha256').update(expired).digest('hex'),
            expiresAt: new Date(Date.now() - 1000)
          }
        })
        assert.equal((await get('/auth/me', bearer(expired))).status, 401)

        assert.equal(
          (await post('/auth/logout', undefined, bearer(token))).status,
          204
        )
        assert.equal((await get('/auth/me', bearer(token))).status, 401)
      }
    )

    await t.test(
      'ownership checks scope nested resources to their owner',
      async () => {
        const intruder = await prisma.user.create({
          data: { email: 'intruder@example.com', passwordHash: 'test-only' }
        })
        const project = await prisma.project.create({
          data: { name: '归属项目', ownerId: user.id }
        })
        const episode = await prisma.episode.create({
          data: { projectId: project.id, title: '第一集' }
        })
        const ownership = new OwnershipService(prisma)

        await ownership.assertOwned(user.id, 'project', project.id)
        await ownership.assertOwned(user.id, 'episode', episode.id)
        await assert.rejects(
          () => ownership.assertOwned(intruder.id, 'project', project.id),
          (error) => {
            assert.equal(error.getStatus(), 404)
            assert.equal(error.message, 'Resource not found')
            return true
          }
        )
        await assert.rejects(
          () => ownership.assertOwned(intruder.id, 'episode', episode.id),
          { name: 'NotFoundException' }
        )
        await assert.rejects(
          () => ownership.assertOwned(user.id, 'project', 'not-a-uuid'),
          (error) => {
            assert.equal(error.getStatus(), 400)
            return true
          }
        )
      }
    )
  }
)

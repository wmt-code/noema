import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../dist/app.module.js'
import { AgentService } from '../dist/agent.service.js'
import { AuthService } from '../dist/auth.service.js'
import { testApp, testDatabase } from './database.mjs'
import { definition, response } from './agent-fixtures.mjs'

test(
  'authenticated owner can run an agent; invalid output never reaches persistence',
  { timeout: 60000 },
  async (t) => {
    const { prisma, url } = await testDatabase(t)
    const base = await testApp(t, url)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false
    })
    t.after(() => app.close())
    const runtime = app.get(AgentService)
    const auth = app.get(AuthService)
    const login = async (email) => {
      const body = JSON.stringify({
        email,
        password: 'a-very-secure-passphrase'
      })
      const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body
      }
      assert.equal((await fetch(`${base}/auth/register`, options)).status, 201)
      const result = await fetch(`${base}/auth/login`, options)
      assert.equal(result.status, 200)
      return auth.authenticate(`Bearer ${(await result.json()).accessToken}`)
    }
    const { user } = await login('agent-owner@example.com')
    const stranger = await login('agent-stranger@example.com')
    const project = await prisma.project.create({
      data: { ownerId: user.id, name: 'Agent test' }
    })
    const episode = await prisma.episode.create({
      data: { projectId: project.id, title: 'Episode' }
    })
    const scope = { user, resource: 'episode', resourceId: episode.id }
    let requests = 0
    const config = definition({
      streamFn: () => {
        requests++
        return response()
      }
    })
    await assert.rejects(
      auth.authenticate(undefined),
      (error) => error.getStatus() === 401
    )
    await assert.rejects(
      runtime.run({ ...scope, user: stranger.user }, config, {
        story: 'story'
      }),
      (error) => error.getStatus() === 404
    )
    assert.equal(requests, 0)
    const persist = async (agentConfig, version) => {
      const content = await runtime.run(scope, agentConfig, { story: 'story' })
      return prisma.scriptRevision.create({
        data: { episodeId: episode.id, version, content }
      })
    }
    const saved = await persist(config, 1)
    assert.deepEqual(saved.content, { title: '故事' })
    for (const invalid of ['broken JSON', '{"title":123}']) {
      await assert.rejects(
        persist(definition({ streamFn: () => response(invalid) }), 2),
        (error) => error.getStatus() === 502
      )
      assert.equal(
        await prisma.scriptRevision.count({ where: { episodeId: episode.id } }),
        1
      )
    }
  }
)

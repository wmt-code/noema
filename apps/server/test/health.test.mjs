import 'reflect-metadata'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../dist/app.module.js'

const run = promisify(execFile)
const main = fileURLToPath(new URL('../dist/main.js', import.meta.url))
// An unreachable database keeps the liveness tests independent of infrastructure.
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused'

test('GET /health returns liveness JSON and unknown routes return 404', async (t) => {
  const app = await NestFactory.create(AppModule, { logger: false })
  t.after(() => app.close())
  await app.listen(0, '127.0.0.1')
  const url = await app.getUrl()

  const health = await fetch(`${url}/health`, {
    signal: AbortSignal.timeout(5000)
  })
  assert.equal(health.status, 200)
  assert.match(health.headers.get('content-type'), /^application\/json\b/)
  assert.deepEqual(await health.json(), { status: 'ok' })

  const missing = await fetch(`${url}/missing`, {
    signal: AbortSignal.timeout(5000)
  })
  assert.equal(missing.status, 404)
  assert.equal((await missing.json()).statusCode, 404)
})

test('startup rejects a missing DATABASE_URL', async () => {
  const env = { ...process.env, PORT: '3000' }
  delete env.DATABASE_URL
  await assert.rejects(
    run(process.execPath, [main], { env, timeout: 10000 }),
    (error) => {
      assert.equal(error.code, 1)
      assert.match(error.stderr, /DATABASE_URL is required/)
      return true
    }
  )
})

test('startup rejects invalid PORT values without binding', async () => {
  for (const port of [
    '',
    ' ',
    '0',
    '-1',
    '65536',
    '3000.5',
    '3000oops',
    '1e3',
    '0xBB8',
    'Infinity'
  ]) {
    await assert.rejects(
      run(process.execPath, [main], {
        env: { ...process.env, PORT: port },
        timeout: 10000
      }),
      (error) => {
        assert.equal(error.code, 1, `PORT=${JSON.stringify(port)}`)
        assert.match(
          error.stderr,
          /PORT must be an integer between 1 and 65535/
        )
        return true
      }
    )
  }
})

test('startup exits unsuccessfully when the configured port is occupied', async (t) => {
  const server = createServer()
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
  )
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  await assert.rejects(
    run(process.execPath, [main], {
      env: { ...process.env, PORT: String(server.address().port) },
      timeout: 10000
    }),
    (error) => {
      assert.equal(error.code, 1)
      assert.match(error.stderr, /EADDRINUSE/)
      return true
    }
  )
})

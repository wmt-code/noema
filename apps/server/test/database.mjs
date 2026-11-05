import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../dist/generated/prisma/client.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(new URL('../../../package.json', import.meta.url))
const prismaCli = require.resolve('prisma/build/index.js')

export function deploy(url) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`Migration failed (${code}): ${output}`))
    })
  })
}

export async function testDatabase(t) {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required')
  const url = new URL(process.env.DATABASE_URL)
  const schema = `test_${randomUUID().replaceAll('-', '')}`
  url.searchParams.set('schema', schema)
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString() }, { schema })
  })
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  t.after(async () => {
    try {
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
    } finally {
      await prisma.$disconnect()
    }
  })
  return { prisma, schema, url: url.toString() }
}

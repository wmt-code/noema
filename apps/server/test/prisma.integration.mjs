import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../dist/app.module.js'
import { PrismaService } from '../dist/prisma.service.js'

test(
  'Nest Prisma provider connects to PostgreSQL and executes SQL',
  { timeout: 15000 },
  async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false
    })
    try {
      const prisma = app.get(PrismaService)
      await prisma.$connect()
      const rows = await prisma.$queryRaw`SELECT 1::int AS value`
      assert.deepEqual(rows, [{ value: 1 }])
    } finally {
      await app.close()
    }
  }
)

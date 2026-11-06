import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from './prisma.service.js'

@Injectable()
export class ModelCredentialService {
  private key?: Promise<Buffer>
  constructor(private readonly prisma: PrismaService) {}

  private encryptionKey(): Promise<Buffer> {
    this.key ??= this.loadKey().catch(() => {
      this.key = undefined
      throw new ServiceUnavailableException('Credential storage unavailable')
    })
    return this.key
  }

  private async loadKey(): Promise<Buffer> {
    const directory =
      process.env.NOEMA_DATA_DIR ??
      fileURLToPath(new URL('../../../.data', import.meta.url))
    const file = join(directory, 'credential.key')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    try {
      const key = await readFile(file)
      if (key.length !== 32) throw new Error('Invalid storage key')
      return key
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      // Never silently replace a lost encryption key while ciphertext exists.
      if (await this.prisma.modelCredential.count())
        throw new Error('Missing storage key', { cause: error })
      const key = randomBytes(32)
      try {
        await writeFile(file, key, { flag: 'wx', mode: 0o600 })
        return key
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        const existing = await readFile(file)
        if (existing.length !== 32)
          throw new Error('Invalid storage key', { cause: error })
        return existing
      }
    }
  }

  list(userId: string) {
    return this.prisma.modelCredential.findMany({
      where: { userId },
      select: { provider: true, baseUrl: true, updatedAt: true }
    })
  }

  async save(
    userId: string,
    provider: string,
    apiKey: string,
    baseUrl: string | null = null
  ): Promise<void> {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', await this.encryptionKey(), iv)
    cipher.setAAD(
      Buffer.from([userId, provider, ...(baseUrl ? [baseUrl] : [])].join(':'))
    )
    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final()
    ])
    const encryptedKey = Buffer.concat([
      iv,
      cipher.getAuthTag(),
      encrypted
    ]).toString('base64')
    await this.prisma.modelCredential.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, encryptedKey, baseUrl },
      update: { encryptedKey, baseUrl }
    })
  }

  async get(userId: string, provider: string) {
    const row = await this.prisma.modelCredential.findUnique({
      where: { userId_provider: { userId, provider } }
    })
    if (!row)
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'MISSING_MODEL_CREDENTIAL',
        provider
      })
    try {
      const { baseUrl } = row
      const data = Buffer.from(row.encryptedKey, 'base64')
      const decipher = createDecipheriv(
        'aes-256-gcm',
        await this.encryptionKey(),
        data.subarray(0, 12)
      )
      decipher.setAAD(
        Buffer.from([userId, provider, ...(baseUrl ? [baseUrl] : [])].join(':'))
      )
      decipher.setAuthTag(data.subarray(12, 28))
      const apiKey = Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final()
      ]).toString('utf8')
      return { apiKey, baseUrl }
    } catch {
      throw new ServiceUnavailableException('Credential storage unavailable')
    }
  }

  async remove(userId: string, provider: string): Promise<void> {
    await this.prisma.modelCredential.deleteMany({
      where: { userId, provider }
    })
  }
}

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { Prisma } from './generated/prisma/client.js'
import { PrismaService } from './prisma.service.js'

function credentials(body: unknown): { email: string; password: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Email and password are required')
  }
  const input = body as Record<string, unknown>
  if (
    Object.keys(input).some((key) => key !== 'email' && key !== 'password') ||
    typeof input.email !== 'string' ||
    typeof input.password !== 'string'
  ) {
    throw new BadRequestException('Only email and password are accepted')
  }
  const email = input.email.trim().toLowerCase()
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    input.password.length < 12 ||
    Buffer.byteLength(input.password, 'utf8') > 128
  ) {
    throw new BadRequestException(
      'Use a valid email and a 12–128 byte password'
    )
  }
  return { email, password: input.password }
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key))
    )
  })
}

const publicUser = { id: true, email: true } as const
const dummyHash = `scrypt-v1$${'00'.repeat(16)}$${'00'.repeat(64)}`

@Injectable()
export class AuthService {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >()

  constructor(private readonly prisma: PrismaService) {}

  throttle(ip: string): void {
    const now = Date.now()
    for (const [key, attempt] of this.attempts) {
      if (attempt.until <= now) this.attempts.delete(key)
    }
    const attempt = this.attempts.get(ip) ?? { count: 0, until: now + 60000 }
    if (attempt.count >= 10 || this.attempts.size >= 10000) {
      throw new HttpException('Try again later', HttpStatus.TOO_MANY_REQUESTS)
    }
    attempt.count++
    this.attempts.set(ip, attempt)
  }

  async register(body: unknown) {
    const { email, password } = credentials(body)
    const salt = randomBytes(16).toString('hex')
    const hash = await derive(password, salt)
    try {
      return await this.prisma.user.create({
        data: {
          email,
          passwordHash: `scrypt-v1$${salt}$${hash.toString('hex')}`
        },
        select: publicUser
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered')
      }
      throw error
    }
  }

  async login(body: unknown) {
    const { email, password } = credentials(body)
    const user = await this.prisma.user.findUnique({ where: { email } })
    // Missing users still incur the same password derivation cost.
    const [, salt, stored] = (user?.passwordHash ?? dummyHash).split('$')
    const hash = await derive(password, salt)
    if (!timingSafeEqual(hash, Buffer.from(stored, 'hex')) || !user) {
      throw new UnauthorizedException('Invalid email or password')
    }
    const accessToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(accessToken).digest('hex'),
        expiresAt
      }
    })
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt,
      user: { id: user.id, email: user.email }
    }
  }

  async authenticate(authorization: string | undefined) {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization ?? '')
    if (!match) throw new UnauthorizedException('A Bearer token is required')
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: createHash('sha256').update(match[1]).digest('hex') },
      include: { user: { select: publicUser } }
    })
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is invalid or expired')
    }
    return { user: session.user, sessionId: session.id }
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } })
  }
}

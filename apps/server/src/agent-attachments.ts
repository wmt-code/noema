import { BadRequestException, type INestApplication } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { IncomingMessage } from 'node:http'
import type { ImageContent } from '@earendil-works/pi-ai'
import { validateAttachments } from '@noema/shared'

// Nest's ordinary 100 KiB parser still applies to all other routes.
export function configureChatBodyParser(app: INestApplication) {
  const server = app as NestExpressApplication
  server.useBodyParser('json', {
    limit: '3mb',
    type: (req: IncomingMessage) =>
      req.method === 'POST' &&
      /^\/(?:(projects|episodes)\/[^/?]+\/agent-runs|chats\/[^/?]+\/(messages|stream))\/?(?:\?|$)/.test(
        req.url ?? ''
      ) &&
      req.headers['content-type']?.split(';')[0] === 'application/json'
  })
  server.useBodyParser('json', { limit: '100kb' })
}

export function readChatAttachments(value: unknown) {
  const images: ImageContent[] = []
  const documents: string[] = []
  try {
    for (const file of validateAttachments(value)) {
      const data = file.url.slice(file.url.indexOf(',') + 1)
      const bytes = Buffer.from(data, 'base64')
      if (file.contentType.startsWith('image/')) {
        const valid =
          file.contentType === 'image/png'
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from('89504e470d0a1a0a', 'hex'))
            : file.contentType === 'image/jpeg'
              ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
              : bytes.toString('ascii', 0, 4) === 'RIFF' &&
                bytes.toString('ascii', 8, 12) === 'WEBP'
        if (!valid) throw new Error('Invalid image')
        images.push({ type: 'image', data, mimeType: file.contentType })
      } else {
        const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        if (content.includes('\0')) throw new Error('Binary document')
        documents.push(JSON.stringify({ name: file.name, content }))
      }
    }
  } catch {
    throw new BadRequestException('Invalid chat attachments')
  }
  return {
    images,
    attachmentText: documents.length
      ? '用户附加的文档：\n' + documents.join('\n')
      : ''
  }
}

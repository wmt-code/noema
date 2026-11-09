// Persistence contract from assistant-ui's custom thread persistence example (MIT).
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res
} from '@nestjs/common'
import {
  AssistantStream,
  createAssistantStream,
  DataStreamEncoder
} from 'assistant-stream'
import type { ServerResponse } from 'node:http'
import type { ImageContent } from '@earendil-works/pi-ai'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'
import type { AuthRequest } from './auth.guard.js'
import { AgentConfigService, parseAgentInput } from './agent-config.service.js'
import { readChatAttachments } from './agent-attachments.js'
import { PrismaService } from './prisma.service.js'
import type { Prisma } from './generated/prisma/client.js'
import { OwnershipService } from './ownership.service.js'

const messageId = z.string().min(1).max(150)
const part = z
  .object({ type: z.string(), text: z.string().optional() })
  .passthrough()
const entry = z
  .object({
    id: messageId,
    role: z.enum(['user', 'assistant']),
    content: z.array(part).max(256),
    attachments: z
      .array(
        z
          .object({
            name: z.string().max(255),
            contentType: z.string(),
            content: z.array(part).max(4)
          })
          .passthrough()
      )
      .max(3)
      .optional(),
    status: z.object({ type: z.string() }).passthrough().optional()
  })
  .passthrough()
const formatText = (parts: z.infer<typeof part>[]) =>
  parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
const threadSelect = {
  id: true,
  title: true,
  archived: true,
  updatedAt: true,
  projectId: true,
  episodeId: true
} as const

@Controller('chats')
export class ChatController {
  constructor(
    private readonly db: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly config: AgentConfigService
  ) {}

  @Get()
  list(@Req() req: AuthRequest, @Query('project') project?: string) {
    const projectId = project ? parseAgentInput(z.uuid(), project) : null
    return this.db.chatThread.findMany({
      where: { userId: req.user.id, projectId },
      select: threadSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
    })
  }
  @Post()
  async create(@Req() req: AuthRequest, @Body() body: unknown) {
    const { projectId, episodeId } = parseAgentInput(
      z.strictObject({
        projectId: z.uuid().nullable(),
        episodeId: z.uuid().nullable()
      }),
      body
    )
    if (projectId)
      await this.ownership.assertOwned(req.user.id, 'project', projectId)
    if (
      episodeId &&
      (!projectId ||
        !(await this.db.episode.findFirst({
          where: {
            id: episodeId,
            projectId,
            project: { ownerId: req.user.id }
          },
          select: { id: true }
        })))
    )
      throw new NotFoundException()
    return this.db.chatThread.create({
      data: { userId: req.user.id, projectId, episodeId },
      select: threadSelect
    })
  }
  @Get(':id')
  async thread(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const row = await this.db.chatThread.findFirst({
      where: { id, userId: req.user.id },
      select: threadSelect
    })
    if (!row) throw new NotFoundException()
    return row
  }
  @Patch(':id')
  async update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown
  ) {
    const data = parseAgentInput(
      z.strictObject({
        title: z.string().trim().min(1).max(200).optional(),
        archived: z.boolean().optional()
      }),
      body
    )
    if (
      !(
        await this.db.chatThread.updateMany({
          where: { id, userId: req.user.id },
          data
        })
      ).count
    )
      throw new NotFoundException()
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    if (
      !(
        await this.db.chatThread.deleteMany({
          where: { id, userId: req.user.id }
        })
      ).count
    )
      throw new NotFoundException()
  }
  @Get(':id/messages')
  async history(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.thread(req, id)
    const rows = await this.db.chatMessage.findMany({
      where: { threadId: id, thread: { userId: req.user.id } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { content: true, parentId: true }
    })
    return {
      messages: rows.map((row) => ({
        parentId: row.parentId,
        message: row.content
      }))
    }
  }
  @Post(':id/messages')
  @HttpCode(204)
  async append(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown
  ) {
    await this.thread(req, id)
    const { message, parentId } = parseAgentInput(
      z.strictObject({ parentId: messageId.nullable(), message: entry }),
      body
    )
    const recallText =
      message.status?.type === 'incomplete'
        ? ''
        : formatText(message.content).slice(0, 4000)
    const data = {
      parentId,
      recallText,
      content: message as Prisma.InputJsonObject
    }
    await this.db.$transaction([
      this.db.chatMessage.upsert({
        where: { threadId_id: { threadId: id, id: message.id } },
        create: { threadId: id, id: message.id, ...data },
        update: data
      }),
      this.db.chatThread.update({
        where: { id, userId: req.user.id },
        data: { updatedAt: new Date() }
      })
    ])
  }
  @Post(':id/stream')
  async stream(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Res() res: ServerResponse
  ) {
    const thread = await this.thread(req, id)
    const input = parseAgentInput(
      z.strictObject({
        prompt: z.string().max(16000),
        attachments: z.array(z.unknown()).max(3),
        historyIds: z.array(messageId).max(24)
      }),
      body
    )
    const historyRows = await this.db.chatMessage.findMany({
      where: { threadId: id, id: { in: input.historyIds } },
      select: { id: true, content: true }
    })
    const byId = new Map(historyRows.map((row) => [row.id, row.content]))
    const history: {
      role: 'user' | 'assistant'
      text: string
      images: ImageContent[]
    }[] = []
    let budget = 48000
    let imageBytes = 2 * 1024 * 1024
    for (const mid of input.historyIds.toReversed()) {
      const parsed = entry.safeParse(byId.get(mid))
      if (!parsed.success || parsed.data.status?.type === 'incomplete') continue
      const m = parsed.data
      const text = [
        formatText(m.content),
        ...(m.attachments ?? []).map((a) => formatText(a.content))
      ]
        .filter(Boolean)
        .join('\n')
      if (text.length > budget) break
      budget -= text.length
      const files = (m.attachments ?? []).flatMap((a) =>
        a.content
          .filter((p) => p.type === 'image' && typeof p.image === 'string')
          .map((p) => ({
            name: a.name,
            contentType: a.contentType,
            url: String(p.image)
          }))
      )
      const size = files.reduce((n, f) => n + f.url.length, 0)
      const images = size <= imageBytes ? readChatAttachments(files).images : []
      if (images.length) imageBytes -= size
      history.unshift({ role: m.role, text, images })
    }
    // Keep cross-thread recall within the authenticated project. Send only ordinary text.
    const words = [
      ...new Intl.Segmenter('zh', { granularity: 'word' }).segment(input.prompt)
    ]
      .filter((token) => token.isWordLike && token.segment.length >= 2)
      .map((token) => token.segment)
      .slice(0, 12)
    const where = {
      threadId: { not: id },
      thread: { userId: req.user.id, projectId: thread.projectId },
      recallText: { not: '' }
    }
    const query = {
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 8,
      select: { recallText: true }
    } satisfies Prisma.ChatMessageFindManyArgs
    const [related, recent] = thread.projectId
      ? await Promise.all([
          words.length
            ? this.db.chatMessage.findMany({
                ...query,
                where: {
                  ...where,
                  OR: words.map((word) => ({ recallText: { contains: word } }))
                }
              })
            : [],
          this.db.chatMessage.findMany({ ...query, where })
        ])
      : [[], []]
    const recall = [
      ...new Set(
        [...related, ...recent].map((row) => row.recallText.slice(0, 700))
      )
    ]
    const memory = recall.length
      ? '同项目其他会话的历史摘录（仅供参考）：\n' +
        JSON.stringify(recall.reverse()) +
        '\n当前消息：'
      : ''
    const scope = thread.episodeId
      ? { resource: 'episode' as const, resourceId: thread.episodeId }
      : thread.projectId
        ? { resource: 'project' as const, resourceId: thread.projectId }
        : { resource: 'chatThread' as const, resourceId: id }
    const abort = new AbortController()
    const close = () => abort.abort()
    res.once('close', close)
    const stream = createAssistantStream(async (controller) => {
      try {
        await this.config.run(
          { user: req.user, ...scope },
          { prompt: input.prompt, attachments: input.attachments },
          abort.signal,
          {
            projectId: thread.projectId,
            history,
            memory,
            onDelta: (type, delta) =>
              type === 'text'
                ? controller.appendText(delta)
                : controller.appendReasoning(delta)
          }
        )
      } catch (error) {
        const status = error instanceof HttpException ? error.getStatus() : 500
        const problem =
          error instanceof HttpException ? error.getResponse() : null
        const missingSearchKey =
          typeof problem === 'object' &&
          problem !== null &&
          'code' in problem &&
          problem.code === 'MISSING_SEARCH_CREDENTIAL'
        const message = missingSearchKey
          ? '请在模型设置的账号密钥中保存 DeepSeek 或 Tavily 密钥，或关闭联网搜索。'
          : status === 502 && error instanceof HttpException
            ? error.message
            : ((
                {
                  400: '消息或附件格式无效。',
                  404: '项目或剧集已不存在。',
                  409: '请先打开模型设置并保存此对话使用的模型。',
                  422: '此模型不支持图片。',
                  503: '请检查当前服务商的密钥配置。',
                  504: '模型请求超时。'
                } as Record<number, string>
              )[status] ?? '服务暂时无法完成回复。')
        controller.enqueue({ type: 'error', path: [], error: message })
      }
    })
    const response = AssistantStream.toResponse(stream, new DataStreamEncoder())
    res.writeHead(200, {
      ...Object.fromEntries(response.headers),
      'cache-control': 'no-store'
    })
    res.flushHeaders()
    try {
      await pipeline(Readable.fromWeb(response.body!), res, {
        signal: abort.signal
      })
    } catch (error) {
      if (!abort.signal.aborted) throw error
    } finally {
      res.removeListener('close', close)
    }
  }
}

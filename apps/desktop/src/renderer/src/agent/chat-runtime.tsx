// Adapted from assistant-ui's custom thread persistence and with-custom-thread-list examples (MIT).
import { useMemo, type ReactNode } from 'react'
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  ExportedMessageRepository,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type CompleteAttachment,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter
} from '@assistant-ui/react'
import {
  AssistantStream,
  AssistantMessageStream,
  DataStreamDecoder,
  createAssistantStream
} from 'assistant-stream'
import {
  attachmentBytes,
  attachmentTypes,
  textAttachmentBytes,
  validateAttachments,
  type ChatAttachment
} from '@noema/shared'
import { request } from '@/lib/api'
import type { ChatThread } from '../../../shared/api'

const metadata = (thread: ChatThread) => ({
  remoteId: thread.id,
  title: thread.title,
  status: thread.archived ? ('archived' as const) : ('regular' as const),
  lastMessageAt: new Date(thread.updatedAt)
})
const images = new SimpleImageAttachmentAdapter()
images.accept = '.jpg,.jpeg,.png,.webp'
const documents = new SimpleTextAttachmentAdapter()
documents.accept = '.txt,.md,.json,.csv'
const attachments = new CompositeAttachmentAdapter([images, documents])
const addFile = attachments.add.bind(attachments)
attachments.add = ({ file }) => {
  const ext = file.name
    .split('.')
    .at(-1)
    ?.toLowerCase() as keyof typeof attachmentTypes
  const mime = attachmentTypes[ext]
  if (
    !mime ||
    file.size >
      (mime.startsWith('image/') ? attachmentBytes : textAttachmentBytes)
  )
    throw new Error('附件类型或大小超出限制。')
  return addFile({ file: new File([file], file.name, { type: mime }) })
}
function toFile(attachment: CompleteAttachment): ChatAttachment {
  const part = attachment.content[0]
  if (part?.type === 'image')
    return {
      name: attachment.name,
      contentType: attachment.contentType ?? '',
      url: part.image
    }
  if (part?.type !== 'text') throw new Error('附件内容无效。')
  const text = part.text
    .replace(/^<attachment [^\n]*>\n/, '')
    .replace(/\n<\/attachment>$/, '')
  const encoded = btoa(
    Array.from(new TextEncoder().encode(text), (b) =>
      String.fromCharCode(b)
    ).join('')
  )
  return {
    name: attachment.name,
    contentType: attachment.contentType ?? '',
    url: 'data:' + attachment.contentType + ';base64,' + encoded
  }
}

function useChatRuntime() {
  const aui = useAui()
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        const { remoteId } = aui.threadListItem.getState()
        if (!remoteId) return { messages: [] }
        const repo = await request<ExportedMessageRepository>({
          type: 'chats:history',
          id: remoteId
        })
        return ExportedMessageRepository.fromBranchableArray(
          repo.messages.map((item) => ({
            ...item,
            message: {
              ...item.message,
              createdAt: new Date(item.message.createdAt)
            }
          }))
        )
      },
      async append({ message, parentId }) {
        const { remoteId } = await aui.threadListItem.initialize()
        await request({
          type: 'chats:append',
          id: remoteId,
          item: JSON.parse(
            JSON.stringify({ message, parentId }, (key, value) =>
              key === 'file' ? undefined : value
            )
          )
        })
      }
    }),
    [aui]
  )
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const user = messages.at(-1)
        if (user?.role !== 'user') throw new Error('缺少用户消息。')
        const files = validateAttachments(user.attachments.map(toFile))
        const { remoteId } = await aui.threadListItem.initialize()
        const key = await request<string>({
          type: 'chats:stream-ticket',
          id: remoteId
        })
        const response = await fetch(
          'noema-chat://api/chats/' + remoteId + '/stream',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-noema-stream': key
            },
            signal: abortSignal,
            body: JSON.stringify({
              prompt: user.content
                .filter((p) => p.type === 'text')
                .map((p) => p.text)
                .join('\n'),
              attachments: files,
              historyIds: messages.slice(-25, -1).map((m) => m.id)
            })
          }
        )
        if (!response.ok)
          throw new Error('无法打开对话连接（HTTP ' + response.status + '）。')
        const stream = AssistantStream.fromResponse(
          response,
          new DataStreamDecoder()
        )
        for await (const update of AssistantMessageStream.fromAssistantStream(
          stream
        )) {
          if (
            update.status.type === 'incomplete' &&
            update.status.reason === 'error'
          ) {
            const err = update.status.error
            throw new Error(
              typeof err === 'string'
                ? err
                : err && typeof err === 'object' && 'message' in err
                  ? String(err.message)
                  : '模型回复中断。'
            )
          }
          yield {
            content: update.content.filter(
              (p) => p.type === 'text' || p.type === 'reasoning'
            )
          }
        }
      }
    }),
    [aui]
  )
  return useLocalRuntime(adapter, { adapters: { history, attachments } })
}

export function ChatRuntime({
  children,
  projectId,
  episodeId
}: {
  children: ReactNode
  projectId: string | null
  episodeId: string | null
}) {
  const adapter = useMemo<RemoteThreadListAdapter>(
    () => ({
      async list() {
        const rows = await request<ChatThread[]>({
          type: 'chats:list',
          projectId
        })
        return {
          threads: rows.filter((t) => t.episodeId === episodeId).map(metadata)
        }
      },
      async initialize() {
        const row = await request<ChatThread>({
          type: 'chats:create',
          projectId,
          episodeId
        })
        return { remoteId: row.id, externalId: undefined }
      },
      async fetch(id) {
        return metadata(await request<ChatThread>({ type: 'chats:get', id }))
      },
      async rename(id, title) {
        await request({ type: 'chats:update', id, data: { title } })
      },
      async archive(id) {
        await request({ type: 'chats:update', id, data: { archived: true } })
      },
      async unarchive(id) {
        await request({ type: 'chats:update', id, data: { archived: false } })
      },
      async delete(id) {
        await request({ type: 'chats:delete', id })
      },
      async generateTitle(id, messages) {
        return createAssistantStream(async (controller) => {
          const first = messages.find((m) => m.role === 'user')
          const title =
            first?.content
              .filter((p) => p.type === 'text')
              .map((p) => p.text)
              .join(' ')
              .trim()
              .slice(0, 50) ||
            first?.attachments[0]?.name ||
            '新对话'
          await request({ type: 'chats:update', id, data: { title } })
          controller.appendText(title)
        })
      }
    }),
    [projectId, episodeId]
  )
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useChatRuntime,
    adapter
  })
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  )
}

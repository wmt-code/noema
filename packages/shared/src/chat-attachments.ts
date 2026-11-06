import { ValidationError } from './validation.js'

export const attachmentTypes = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
} as const
export const attachmentLimit = 3
export const attachmentBytes = 2 * 1024 * 1024
export const textAttachmentBytes = 64 * 1024
export type ChatAttachment = { name: string; contentType: string; url: string }

export function validateAttachments(value: unknown): ChatAttachment[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > attachmentLimit)
    throw new ValidationError('最多可添加 3 个附件。')
  let total = 0
  let textBytes = 0
  return value.map((file) => {
    if (
      !file ||
      typeof file.name !== 'string' ||
      !file.name.trim() ||
      file.name.length > 255 ||
      [...file.name].some(
        (c) => c === '/' || c === '\\' || c.charCodeAt(0) < 32
      )
    )
      throw new ValidationError('附件名称无效。')
    const ext = file.name.split('.').pop()?.toLowerCase()
    const mime =
      Object.hasOwn(attachmentTypes, ext) &&
      attachmentTypes[ext as keyof typeof attachmentTypes]
    if (!mime || file.contentType !== mime || typeof file.url !== 'string')
      throw new ValidationError('不支持此附件类型。')
    const prefix = 'data:' + mime + ';base64,'
    if (
      file.url.length > 4 * Math.ceil(attachmentBytes / 3) + prefix.length ||
      !file.url.startsWith(prefix)
    )
      throw new ValidationError('附件无效或超过 2 MiB。')
    const data = file.url.slice(prefix.length)
    if (!data || data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
      throw new ValidationError('附件内容无效。')
    const size =
      (data.length / 4) * 3 -
      (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0)
    total += size
    if (!mime.startsWith('image/')) textBytes += size
    if (total > attachmentBytes || textBytes > textAttachmentBytes)
      throw new ValidationError('附件合计限 2 MiB，其中文本合计限 64 KiB。')
    return { name: file.name, contentType: mime, url: file.url }
  })
}

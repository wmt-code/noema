import type { EpisodeStatus } from '@noema/shared'
export const statuses: Record<EpisodeStatus, string> = {
  DRAFT: '草稿',
  IN_PROGRESS: '制作中',
  COMPLETED: '已完成'
}
export const date = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date(value))

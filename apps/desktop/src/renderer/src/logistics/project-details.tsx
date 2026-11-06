import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Episode, Project, User } from '../../../shared/api'
import { EPISODE_STATUSES } from '@noema/shared'
import { date, statuses } from './project-format'

type Props = {
  project: Project
  user: User
  episodes: Episode[] | null
  episodeContent: ReactNode
  menu: ReactNode
}
function ProjectOverview({
  project,
  user,
  episodes,
  menu
}: Omit<Props, 'episodeContent'>) {
  return (
    <div className="@container/overview flex flex-col gap-4">
      <div className="flex flex-col gap-2 @lg/overview:flex-row @lg/overview:items-center @lg/overview:justify-between @lg/overview:gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 wrap-anywhere text-lg font-medium tracking-tight tabular-nums @lg/overview:text-xl">
            {project.name}
          </h1>
          {menu}
        </div>

        <div className="flex items-center gap-2 text-xs @lg/overview:text-sm">
          <Badge variant="outline">短剧项目</Badge>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground tabular-nums">
            {episodes ? episodes.length + ' 个剧集' : '剧集数量待加载'}
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-9 after:rounded-sm">
            <AvatarFallback className="rounded-sm">
              {user.email[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <div className="text-sm leading-none font-medium">创作者</div>
            <div className="text-muted-foreground flex items-center gap-2">
              <span
                className="truncate text-xs leading-none tracking-tight tabular-nums"
                title={user.email}
              >
                {user.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="secondary">个人工作空间</Badge>
          <div className="text-muted-foreground text-xs leading-none">
            {date(project.createdAt)} 创建
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-8">
        <h2 className="font-medium">项目详情</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 @lg/overview:grid-cols-3">
          {[
            ['项目编号', project.id],
            ['创建日期', date(project.createdAt)],
            ['最近更新', date(project.updatedAt)]
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-2">
              <div className="text-muted-foreground text-xs leading-none">
                {label}
              </div>
              <div className="text-sm wrap-anywhere">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export function ProjectDetails({
  project,
  user,
  episodes,
  episodeContent,
  menu
}: Props) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[min(320px,52%)_minmax(0,1fr)] overflow-hidden lg:grid-rows-[min(420px,52%)_minmax(0,1fr)]">
      <div className="min-h-0 overflow-hidden">{episodeContent}</div>
      <div className="min-h-0 overflow-hidden">
        <div className="h-full min-h-0 py-2">
          <Tabs defaultValue="overview" className="h-full gap-0">
            <TabsList
              className="w-full justify-start gap-2 border-b px-4 **:data-[slot=tabs-trigger]:text-xs sm:gap-4 sm:**:data-[slot=tabs-trigger]:text-sm"
              variant="line"
            >
              <TabsTrigger className="flex-none" value="overview">
                项目概览
              </TabsTrigger>
              <TabsTrigger className="flex-none" value="progress">
                制作进度
              </TabsTrigger>
            </TabsList>
            <TabsContent className="min-h-0 overflow-auto p-4" value="overview">
              <ProjectOverview
                project={project}
                user={user}
                episodes={episodes}
                menu={menu}
              />
            </TabsContent>
            <TabsContent className="min-h-0 overflow-auto p-4" value="progress">
              {episodes ? (
                <dl className="grid grid-cols-3 gap-4">
                  {EPISODE_STATUSES.map((status) => (
                    <div key={status}>
                      <dt className="text-muted-foreground text-sm">
                        {statuses[status]}
                      </dt>
                      <dd className="text-lg tabular-nums">
                        {episodes.filter((e) => e.status === status).length}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  剧集数据尚未载入。
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

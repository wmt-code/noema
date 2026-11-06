import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import {
  CalendarDays,
  Clapperboard,
  Clock3,
  FolderOpen,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react'
import type { Project } from '../../../shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { date } from './project-format'

type Props = {
  projects: Project[]
  selectedId: string | null
  select: (id: string) => void
  create: () => void
  reload: () => void
  sortControl: ReactNode
  query: string
  setQuery: (text: string) => void
  loading: boolean
  loadError: string
}

function ProjectCard({
  project,
  active,
  select
}: {
  project: Project
  active: boolean
  select: (id: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={project.name}
      onClick={() => select(project.id)}
      className={cn(
        'flex w-full flex-col gap-5 rounded-xl border p-3 text-left transition-colors',
        'hover:bg-muted/50 focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
        active && 'border-primary bg-muted/50'
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate" title={project.name}>
          {project.name}
        </span>
        <Clapperboard
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4" />
          <div className="flex flex-col gap-0.5">
            <div className="text-xs leading-none font-medium">创建日期</div>
            <div className="text-muted-foreground text-xs">
              {date(project.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs leading-none font-medium">最近更新</div>
            <div className="text-muted-foreground text-xs">
              {date(project.updatedAt)}
            </div>
          </div>
          <Clock3 className="size-4" />
        </div>
      </div>
    </button>
  )
}
export function ProjectList({
  projects,
  selectedId,
  select,
  create,
  reload,
  sortControl,
  query,
  setQuery,
  loading,
  loadError
}: Props) {
  const [scope, setScope] = useState('all')
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - 6)
  const recent = projects.filter((p) => new Date(p.updatedAt) >= cutoff)
  const visible = (scope === 'all' ? projects : recent).filter((p) =>
    p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
  return (
    <Card className="h-full rounded-none ring-0">
      <CardHeader>
        <CardTitle className="text-xl font-normal">
          <h1>我的项目</h1>
        </CardTitle>
        <CardAction>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="新建项目"
            disabled={loading || !!loadError}
            onClick={create}
          >
            <Plus />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden px-0">
        <Tabs value={scope} onValueChange={setScope}>
          <TabsList
            className="w-full border-b px-4"
            variant="line"
            aria-label="项目范围"
          >
            <TabsTrigger value="all">全部项目 ({projects.length})</TabsTrigger>
            <TabsTrigger value="recent">
              近七天更新 ({recent.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="px-4">
          <InputGroup className="h-8">
            <InputGroupInput
              className="h-8"
              aria-label="搜索项目"
              placeholder="搜索项目…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="flex items-center justify-between gap-2 px-4">
          <span role="status" className="text-xs text-muted-foreground">
            {visible.length} 个项目
          </span>
          <div className="flex items-center gap-1">
            {sortControl}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="刷新列表"
              disabled={loading}
              onClick={reload}
            >
              <RefreshCw />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-0 flex-1">
          <div className="flex flex-col gap-4 px-4">
            {loading ? (
              <Spinner aria-label="正在加载项目" />
            ) : loadError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {loadError}
                  <Button variant="outline" onClick={reload}>
                    重试
                  </Button>
                </AlertDescription>
              </Alert>
            ) : visible.length ? (
              visible.map((project) => (
                <ProjectCard
                  active={project.id === selectedId}
                  key={project.id}
                  project={project}
                  select={select}
                />
              ))
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen />
                  </EmptyMedia>
                  <EmptyTitle role="heading" aria-level={2}>
                    {projects.length ? '没有找到项目' : '还没有项目'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {projects.length
                      ? '试试其他关键词，或查看全部项目。'
                      : '新建一个项目，开始编排剧集。'}
                  </EmptyDescription>
                </EmptyHeader>
                {(query || scope !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery('')
                      setScope('all')
                    }}
                  >
                    清除搜索
                  </Button>
                )}
              </Empty>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

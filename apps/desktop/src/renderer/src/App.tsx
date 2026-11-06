import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react'
import {
  PlusCircleIcon,
  Check,
  Film,
  FolderClosed,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react'
import { EPISODE_STATUSES, type EpisodeStatus } from '@noema/shared'
import type { Episode, Project, User } from '../../shared/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem
} from '@/components/ui/select'
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { ApiError, request } from '@/lib/api'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Logistics } from './logistics/logistics'
import { ProjectList } from './logistics/project-list'
import { ProjectDetails } from './logistics/project-details'
import { statuses, date } from './logistics/project-format'
import { AppSidebar } from './layout/app-sidebar'
import { DashboardLayout } from './layout/dashboard-layout'
import { LoginLayout } from './layout/login-layout'

const message = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请重试。'

export function App() {
  const [user, setUser] = useState<User | null>()
  const [bootError, setBootError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    request<User | null>({ type: 'session' }).then(
      (value) => {
        if (active) setUser(value)
      },
      (error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) setUser(null)
        else setBootError(message(error))
      }
    )
    return () => {
      active = false
    }
  }, [attempt])
  if (user === undefined)
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        {bootError ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              {bootError}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBootError('')
                  setAttempt((value) => value + 1)
                }}
              >
                重试
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Spinner aria-label="正在打开工作台" />
        )}
      </main>
    )
  if (!user) return <Auth onLogin={setUser} />
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          { '--sidebar-width': 'calc(var(--spacing) * 68)' } as CSSProperties
        }
      >
        <Workspace user={user} onLogout={() => setUser(null)} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      onLogin(
        await request<User>({
          type: register ? 'register' : 'login',
          email: String(form.get('email')).trim(),
          password: String(form.get('password'))
        })
      )
    } catch (error) {
      setError(message(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <LoginLayout
      register={register}
      busy={busy}
      switchMode={() => {
        setRegister(!register)
        setError('')
      }}
    >
      <form onSubmit={(event) => void submit(event)}>
        <FieldGroup>
          <Field data-disabled={busy}>
            <FieldLabel htmlFor="email">邮箱</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="you@example.com"
              disabled={busy}
            />
          </Field>
          <Field data-disabled={busy}>
            <FieldLabel htmlFor="password">密码</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={12}
              maxLength={128}
              required
              placeholder={register ? '至少 12 个字符' : '输入密码'}
              disabled={busy}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {register ? '注册并登录' : '登录'}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </LoginLayout>
  )
}

type Editor =
  | { mode: 'create-project' }
  | { mode: 'rename-project' | 'delete-project'; project: Project }
  | { mode: 'create-episode' }
  | { mode: 'edit-episode' | 'delete-episode'; episode: Episode }

function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [requestedId, setProjectId] = useState<string | null>(null)
  const [rawEpisodes, setEpisodes] = useState<Episode[] | null>(null)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [projectQuery, setProjectQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [episodeError, setEpisodeError] = useState('')
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [episodeRefresh, setEpisodeRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [filter, setFilter] = useState('ALL')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<EpisodeStatus>('DRAFT')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { setOpenMobile, isMobile } = useSidebar()
  useEffect(() => {
    if (!isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])
  const project =
    projects.find((item) => item.id === requestedId) ?? projects[0]
  const projectId = project?.id ?? null
  const episodes = loadedProjectId === projectId ? rawEpisodes : null

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) onLogout()
      return message(error)
    },
    [onLogout]
  )

  useEffect(() => {
    let active = true
    request<Project[]>({ type: 'projects:list' }).then(
      (items) => {
        if (active) {
          setProjects(items)
          setLoading(false)
        }
      },
      (error: unknown) => {
        if (active) {
          setLoadError(handleError(error))
          setLoading(false)
        }
      }
    )
    return () => {
      active = false
    }
  }, [refresh, handleError])

  useEffect(() => {
    if (!projectId) return
    let active = true
    request<Episode[]>({ type: 'episodes:list', projectId }).then(
      (items) => {
        if (active) {
          setLoadedProjectId(projectId)
          setEpisodes(items)
          setEpisodeError('')
        }
      },
      (error: unknown) => {
        if (active) setEpisodeError(handleError(error))
      }
    )
    return () => {
      active = false
    }
  }, [projectId, episodeRefresh, handleError])

  function selectProject(id: string | null) {
    setOpenMobile(false)
    setDetailsOpen(!!id && window.innerWidth < 1024)
    setProjectId(id)
    if ((id ?? projects[0]?.id ?? null) === projectId) return
    setEpisodes(null)
    setEpisodeError('')
    setQuery('')
    setFilter('ALL')
    setError('')
  }
  function reloadProjects() {
    setLoading(true)
    setLoadError('')
    setRefresh((value) => value + 1)
  }
  function reloadEpisodes() {
    setEpisodes(null)
    setEpisodeError('')
    setEpisodeRefresh((value) => value + 1)
  }
  function openEditor(value: Editor) {
    setName(
      'project' in value
        ? value.project.name
        : 'episode' in value
          ? value.episode.title
          : ''
    )
    setStatus('episode' in value ? value.episode.status : 'DRAFT')
    setFormError('')
    setEditor(value)
  }
  async function logout() {
    setLoggingOut(true)
    setError('')
    try {
      await request({ type: 'logout' })
      onLogout()
    } catch (error) {
      setError(handleError(error))
      setLoggingOut(false)
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editor || busy) return
    if (!editor.mode.startsWith('delete') && !name.trim()) {
      setFormError('请填写名称。')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      switch (editor.mode) {
        case 'create-project': {
          const item = await request<Project>({
            type: 'projects:create',
            input: { name }
          })
          setProjects((items) => [item, ...items])
          setProjectQuery('')
          selectProject(item.id)
          break
        }
        case 'rename-project': {
          const item = await request<Project>({
            type: 'projects:update',
            id: editor.project.id,
            input: { name }
          })
          setProjects((items) =>
            items.map((value) => (value.id === item.id ? item : value))
          )
          break
        }
        case 'delete-project':
          await request({ type: 'projects:delete', id: editor.project.id })
          setProjects((items) =>
            items.filter((value) => value.id !== editor.project.id)
          )
          if (projectId === editor.project.id) {
            setProjectId(null)
            setDetailsOpen(false)
            setQuery('')
            setFilter('ALL')
            setEpisodeError('')
          }
          break
        case 'create-episode': {
          if (!projectId) return
          const item = await request<Episode>({
            type: 'episodes:create',
            projectId,
            input: { title: name, status }
          })
          setEpisodes((items) => [...(items ?? []), item])
          setQuery('')
          setFilter('ALL')
          break
        }
        case 'edit-episode': {
          const item = await request<Episode>({
            type: 'episodes:update',
            id: editor.episode.id,
            input: { title: name, status }
          })
          setEpisodes(
            (items) =>
              items?.map((value) => (value.id === item.id ? item : value)) ??
              null
          )
          break
        }
        case 'delete-episode':
          await request({ type: 'episodes:delete', id: editor.episode.id })
          setEpisodes(
            (items) =>
              items?.filter((value) => value.id !== editor.episode.id) ?? null
          )
      }
      setEditor(null)
    } catch (error) {
      setFormError(handleError(error))
    } finally {
      setBusy(false)
    }
  }

  const visibleProjects = [...projects].sort((a, b) =>
    sort === 'name'
      ? a.name.localeCompare(b.name, 'zh-CN')
      : b.updatedAt.localeCompare(a.updatedAt)
  )
  const visibleEpisodes =
    episodes?.filter(
      (item) =>
        item.title
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()) &&
        (filter === 'ALL' || item.status === filter)
    ) ?? []
  const deleting = editor?.mode.startsWith('delete')
  const isProjectEditor = editor?.mode.endsWith('project')
  const editorTitle = editor
    ? {
        'create-project': '新建项目',
        'rename-project': '重命名项目',
        'delete-project': '确认删除项目',
        'create-episode': '新建剧集',
        'edit-episode': '编辑剧集',
        'delete-episode': '确认删除剧集'
      }[editor.mode]
    : ''

  function projectMenu(item: Project) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${item.name} 的操作`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() =>
                openEditor({ mode: 'rename-project', project: item })
              }
            >
              <Pencil />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                openEditor({ mode: 'delete-project', project: item })
              }
            >
              <Trash2 />
              删除项目
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const episodeContent = project && (
    <section
      aria-label="剧集内容"
      className="@container/episodes flex h-full min-h-0 flex-col gap-3 overflow-auto border-b p-4"
    >
      <div className="flex items-center justify-between gap-2 pr-10 lg:pr-0">
        <h2 className="font-medium">剧集内容</h2>
        <Button
          size="sm"
          disabled={episodes === null || !!episodeError}
          onClick={() => openEditor({ mode: 'create-episode' })}
        >
          <Plus />
          新建剧集
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-28 flex-1">
          <InputGroupInput
            value={query}
            aria-label="搜索剧集"
            placeholder="搜索剧集…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36" aria-label="筛选状态">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectItem value="ALL">全部状态</SelectItem>
              {EPISODE_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {statuses[value]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          disabled={episodes === null && !episodeError}
          onClick={reloadEpisodes}
          aria-label="刷新剧集"
        >
          <RefreshCw />
        </Button>
      </div>
      {episodeError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {episodeError}
            <Button variant="outline" size="sm" onClick={reloadEpisodes}>
              重试
            </Button>
          </AlertDescription>
        </Alert>
      ) : episodes === null ? (
        <div
          className="flex min-h-24 items-center justify-center gap-2"
          role="status"
        >
          <Spinner />
          正在加载
        </div>
      ) : visibleEpisodes.length ? (
        <section aria-label="剧集列表">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">集序</TableHead>
                <TableHead>剧集名称</TableHead>
                <TableHead className="hidden w-24 @md/episodes:table-cell">
                  状态
                </TableHead>
                <TableHead className="hidden w-28 @xl/episodes:table-cell">
                  最近更新
                </TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEpisodes.map((item) => (
                <TableRow key={item.id} data-testid="episode-row">
                  <TableCell>
                    {String(episodes.indexOf(item) + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Button
                      variant="link"
                      className="max-w-full justify-start"
                      title={item.title}
                      onClick={() =>
                        openEditor({
                          mode: 'edit-episode',
                          episode: item
                        })
                      }
                    >
                      <span className="truncate">{item.title}</span>
                    </Button>
                    <div className="mt-1 @md/episodes:hidden">
                      <Badge
                        variant={
                          item.status === 'COMPLETED'
                            ? 'default'
                            : item.status === 'IN_PROGRESS'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {statuses[item.status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden @md/episodes:table-cell">
                    <Badge
                      variant={
                        item.status === 'COMPLETED'
                          ? 'default'
                          : item.status === 'IN_PROGRESS'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {statuses[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden @xl/episodes:table-cell">
                    {date(item.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${item.title} 的操作`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onSelect={() =>
                              openEditor({
                                mode: 'edit-episode',
                                episode: item
                              })
                            }
                          >
                            <Pencil />
                            编辑剧集
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              openEditor({
                                mode: 'delete-episode',
                                episode: item
                              })
                            }
                          >
                            <Trash2 />
                            删除剧集
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Film />
            </EmptyMedia>
            <EmptyTitle role="heading" aria-level={2}>
              {query || filter !== 'ALL' ? '没有找到剧集' : '还没有剧集'}
            </EmptyTitle>
            <EmptyDescription>
              {query || filter !== 'ALL'
                ? '试试其他关键词，或清除当前筛选。'
                : '从第一集开始，为故事安排一个开场。'}
            </EmptyDescription>
          </EmptyHeader>
          {(query || filter !== 'ALL') && (
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setFilter('ALL')
                }}
              >
                清除筛选
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </section>
  )
  function focusProjectSearch() {
    setDetailsOpen(false)
    document
      .querySelector<HTMLInputElement>('input[aria-label="搜索项目"]')
      ?.focus()
  }
  return (
    <>
      <AppSidebar
        email={user.email}
        onHome={() => selectProject(null)}
        busy={loggingOut}
        logout={() => void logout()}
      >
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton
                  disabled={loading || !!loadError}
                  onClick={() => {
                    setOpenMobile(false)
                    openEditor({ mode: 'create-project' })
                  }}
                  {...(isMobile ? {} : { tooltip: '新建项目' })}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                >
                  <PlusCircleIcon />
                  <span>新建项目</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={true}
                  onClick={() => selectProject(null)}
                >
                  <FolderClosed />
                  <span>项目</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>最近项目</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...projects]
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 5)
                .map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={item.id === projectId}
                      onClick={() => selectProject(item.id)}
                      title={item.name}
                    >
                      <FolderClosed />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </AppSidebar>
      <DashboardLayout email={user.email} focusSearch={focusProjectSearch}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Logistics
          detailsOpen={detailsOpen}
          setDetailsOpen={setDetailsOpen}
          title={project?.name ?? '项目详情'}
          list={
            <ProjectList
              projects={visibleProjects}
              selectedId={projectId}
              select={selectProject}
              create={() => openEditor({ mode: 'create-project' })}
              reload={reloadProjects}
              sortControl={
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-36" aria-label="项目排序">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      <SelectItem value="updated">最近更新</SelectItem>
                      <SelectItem value="name">项目名称</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              }
              query={projectQuery}
              setQuery={setProjectQuery}
              loading={loading}
              loadError={loadError}
            />
          }
          details={
            project ? (
              <ProjectDetails
                key={project.id}
                project={project}
                user={user}
                episodes={episodes}
                episodeContent={episodeContent}
                menu={projectMenu(project)}
              />
            ) : (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen />
                  </EmptyMedia>
                  <EmptyTitle>项目详情</EmptyTitle>
                  <EmptyDescription>
                    选择项目后，在这里查看剧集与项目信息。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          }
        />
      </DashboardLayout>
      <Dialog
        open={editor !== null && !deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null)
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
          showCloseButton={!busy}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{editorTitle}</DialogTitle>
            <DialogDescription>
              {isProjectEditor ? '填写项目名称。' : '填写剧集名称并设置状态。'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void save(event)}>
            <FieldGroup>
              <Field data-disabled={busy}>
                <FieldLabel htmlFor="item-name">
                  {isProjectEditor ? '项目名称' : '剧集名称'}
                </FieldLabel>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={isProjectEditor ? 80 : 200}
                  disabled={busy}
                  autoFocus
                />
              </Field>
              {!isProjectEditor && (
                <Field data-disabled={busy}>
                  <FieldLabel htmlFor="episode-status">状态</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as EpisodeStatus)}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id="episode-status"
                      aria-label="状态"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {EPISODE_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {statuses[value]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <Spinner data-icon="inline-start" />
                  ) : !editor?.mode.startsWith('create') ? (
                    <Check data-icon="inline-start" />
                  ) : null}
                  {editor?.mode === 'create-project'
                    ? '创建项目'
                    : editor?.mode === 'create-episode'
                      ? '创建剧集'
                      : '保存'}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null)
        }}
      >
        <AlertDialogContent
          className="max-h-[90dvh] overflow-y-auto"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{editorTitle}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              “
              {editor && 'project' in editor
                ? editor.project.name
                : editor && 'episode' in editor
                  ? editor.episode.title
                  : ''}
              ”{isProjectEditor ? '及其全部剧集' : ''}将被删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                void save(event)
              }}
            >
              {busy && <Spinner data-icon="inline-start" />}删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

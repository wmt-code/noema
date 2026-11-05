import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Check,
  Film,
  FolderClosed,
  FolderOpen,
  LogOut,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
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
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
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

const statuses: Record<EpisodeStatus, string> = {
  DRAFT: '草稿',
  IN_PROGRESS: '制作中',
  COMPLETED: '已完成'
}
const date = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date(value))
const message = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请重试。'

function Brand() {
  return (
    <div className="brand">
      <img
        className="brand-mark"
        src="./brand/icon-48.png"
        alt=""
        width={32}
        height={32}
      />
      Noema
    </div>
  )
}

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
    <SidebarProvider>
      <Workspace user={user} onLogout={() => setUser(null)} />
    </SidebarProvider>
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
    <div className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <div className="auth-intro">
          <h2>
            从一个故事，
            <br />
            开始第一集。
          </h2>
          <p>短剧创作工作台</p>
        </div>
        <img
          className="auth-art"
          src="./brand/storyboard.webp"
          alt=""
          width={1122}
          height={1402}
        />
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <h1 className="text-3xl font-semibold tracking-tight">
            {register ? '注册 Noema' : '登录 Noema'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {register
              ? '创建账号，建立你的第一个短剧项目。'
              : '登录后，继续管理你的项目与剧集。'}
          </p>
          <form className="mt-8" onSubmit={(event) => void submit(event)}>
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
          <p className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            {register ? '已有账号？' : '还没有账号？'}
            <Button
              variant="link"
              disabled={busy}
              onClick={() => {
                setRegister(!register)
                setError('')
              }}
            >
              {register ? '返回登录' : '注册账号'}
            </Button>
          </p>
        </div>
      </main>
    </div>
  )
}

type Editor =
  | { mode: 'create-project' }
  | { mode: 'rename-project' | 'delete-project'; project: Project }
  | { mode: 'create-episode' }
  | { mode: 'edit-episode' | 'delete-episode'; episode: Episode }

function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<Episode[] | null>(null)
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
  const project = projects.find((item) => item.id === projectId)

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
        if (active) setEpisodes(items)
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
    if (id === projectId) return
    setProjectId(id)
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
          setQuery('')
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
          if (projectId === editor.project.id) selectProject(null)
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

  const visibleProjects = projects
    .filter((item) =>
      item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    )
    .sort((a, b) =>
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

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Brand />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={!projectId}
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
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <div className="flex min-w-0 items-center gap-3 p-2">
            <Avatar>
              <AvatarFallback>{user.email[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate text-sm" title={user.email}>
              {user.email}
            </span>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                <LogOut />
                <span>退出登录</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-8">
          <SidebarTrigger aria-label="打开导航" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="shrink-0">工作台</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="shrink-0">
                {project ? (
                  <BreadcrumbLink asChild>
                    <Button variant="link" onClick={() => selectProject(null)}>
                      项目
                    </Button>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>项目</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {project && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">
                      {project.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {project && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-3"
                  onClick={() => selectProject(null)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  所有项目
                </Button>
              )}
              <h1 className="text-3xl font-semibold wrap-anywhere">
                {project ? project.name : '我的项目'}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {project && projectMenu(project)}
              <Button
                disabled={
                  loading ||
                  !!loadError ||
                  (!!project && (episodes === null || !!episodeError))
                }
                onClick={() =>
                  openEditor({
                    mode: project ? 'create-episode' : 'create-project'
                  })
                }
              >
                <Plus data-icon="inline-start" />
                {project ? '新建剧集' : '新建项目'}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <InputGroup className="mr-auto w-full md:max-w-sm">
              <InputGroupInput
                aria-label={project ? '搜索剧集' : '搜索项目'}
                placeholder={project ? '搜索剧集' : '搜索项目'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
            {project ? (
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
            ) : (
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
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label="刷新列表"
              disabled={project ? episodes === null && !episodeError : loading}
              onClick={project ? reloadEpisodes : reloadProjects}
            >
              {loading || (project && episodes === null && !episodeError) ? (
                <Spinner />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </div>
          <p className="my-6 text-sm text-muted-foreground" role="status">
            {project
              ? episodes === null
                ? '剧集列表'
                : `${episodes.length} 个剧集`
              : loading
                ? '项目列表'
                : `${projects.length} 个项目`}
          </p>
          {loading ? (
            <div
              className="flex min-h-64 items-center justify-center gap-2"
              role="status"
            >
              <Spinner />
              正在加载
            </div>
          ) : loadError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {loadError}
                <Button variant="outline" size="sm" onClick={reloadProjects}>
                  重试
                </Button>
              </AlertDescription>
            </Alert>
          ) : project ? (
            episodeError ? (
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
                className="flex min-h-64 items-center justify-center gap-2"
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
                      <TableHead className="hidden w-24 md:table-cell">
                        状态
                      </TableHead>
                      <TableHead className="hidden w-28 lg:table-cell">
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
                          <div className="mt-1 md:hidden">
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
                        <TableCell className="hidden md:table-cell">
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
                        <TableCell className="hidden lg:table-cell">
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
            )
          ) : visibleProjects.length ? (
            <section aria-label="项目列表">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead className="hidden w-40 md:table-cell">
                      最近更新
                    </TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-normal">
                        <Button
                          variant="link"
                          className="max-w-full justify-start"
                          aria-label={item.name}
                          title={item.name}
                          onClick={() => selectProject(item.id)}
                        >
                          <FolderClosed data-icon="inline-start" />
                          <span className="truncate">{item.name}</span>
                        </Button>
                        <p className="mt-1 text-xs text-muted-foreground md:hidden">
                          更新于 {date(item.updatedAt)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {date(item.updatedAt)}
                      </TableCell>
                      <TableCell>{projectMenu(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderOpen />
                </EmptyMedia>
                <EmptyTitle role="heading" aria-level={2}>
                  {query ? '没有找到项目' : '还没有项目'}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? '试试其他关键词，或清除当前筛选。'
                    : '为你的故事新建一个项目，再逐集展开。'}
                </EmptyDescription>
              </EmptyHeader>
              {query && (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setQuery('')}>
                    清除搜索
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}
        </div>
      </SidebarInset>
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

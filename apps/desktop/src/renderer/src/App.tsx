import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Film,
  FolderClosed,
  FolderOpen,
  Menu,
  LoaderCircle,
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
import { FilterSelect } from '@/components/ui/filter-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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

function ErrorNotice({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <span>{text}</span>
      {retry && (
        <Button variant="ghost" size="sm" onClick={retry}>
          重试
        </Button>
      )}
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
          <ErrorNotice
            text={bootError}
            retry={() => {
              setBootError('')
              setAttempt((value) => value + 1)
            }}
          />
        ) : (
          <LoaderCircle
            aria-label="正在打开工作台"
            className="size-6 animate-spin text-primary"
          />
        )}
      </main>
    )
  if (!user) return <Auth onLogin={setUser} />
  return <Workspace user={user} onLogout={() => setUser(null)} />
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
          <h1 className="text-[28px] font-semibold tracking-tight">
            {register ? '注册 Noema' : '登录 Noema'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {register
              ? '创建账号，建立你的第一个短剧项目。'
              : '登录后，继续管理你的项目与剧集。'}
          </p>
          <form
            className="mt-9 grid gap-5"
            onSubmit={(event) => void submit(event)}
          >
            <label className="field" htmlFor="email">
              邮箱
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
            </label>
            <label className="field" htmlFor="password">
              密码
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
            </label>
            {error && <ErrorNotice text={error} />}
            <Button type="submit" className="mt-1 h-11 w-full" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {register ? '注册并登录' : '登录'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {register ? '已有账号？' : '还没有账号？'}
            <button
              className="ml-1 rounded-sm font-medium text-primary focus-visible:outline-2"
              disabled={busy}
              onClick={() => {
                setRegister(!register)
                setError('')
              }}
            >
              {register ? '返回登录' : '注册账号'}
            </button>
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
  const [navigationOpen, setNavigationOpen] = useState(false)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => {
      if (desktop.matches) setNavigationOpen(false)
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])
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
    setNavigationOpen(false)
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
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() =>
              openEditor({ mode: 'rename-project', project: item })
            }
          >
            <Pencil />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() =>
              openEditor({ mode: 'delete-project', project: item })
            }
          >
            <Trash2 />
            删除项目
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const navigation = (
    <>
      <div className="shrink-0 px-3">
        <Brand />
      </div>
      <nav aria-label="工作台导航" className="mt-10 shrink-0">
        <button
          className="sidebar-nav"
          data-active={!projectId}
          onClick={() => selectProject(null)}
        >
          <FolderClosed size={20} />
          项目
        </button>
      </nav>
      <div className="sidebar-projects">
        <p className="sidebar-recent">最近项目</p>
        <div className="grid gap-1">
          {[...projects]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 5)
            .map((item) => (
              <button
                key={item.id}
                className="sidebar-project"
                data-active={item.id === projectId}
                onClick={() => selectProject(item.id)}
              >
                <FolderClosed size={15} className="shrink-0 opacity-60" />
                <span className="min-w-0 truncate text-[13px]">
                  {item.name}
                </span>
              </button>
            ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-border pt-5">
        <div className="flex min-w-0 items-center gap-3 px-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-foreground">
            {user.email[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-xs" title={user.email}>
            {user.email}
          </span>
        </div>
        <Button
          variant="ghost"
          className="mt-3 h-10 w-full justify-start px-3 text-[13px] leading-5"
          disabled={loggingOut}
          onClick={() => void logout()}
        >
          <LogOut className="shrink-0" />
          <span className="whitespace-nowrap">退出登录</span>
        </Button>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">{navigation}</aside>
      <div className="min-w-0">
        <header className="workspace-header">
          <Dialog open={navigationOpen} onOpenChange={setNavigationOpen}>
            <DialogTrigger asChild>
              <Button
                className="mobile-navigation"
                variant="ghost"
                size="icon"
                aria-label="打开导航"
              >
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent
              side="left"
              className="navigation-drawer"
              aria-describedby={undefined}
            >
              <DialogTitle className="sr-only">工作台导航</DialogTitle>
              <div className="sidebar">{navigation}</div>
            </DialogContent>
          </Dialog>

          <span className="text-xs">工作台</span>
          <ChevronRight size={13} />
          <button
            className="text-xs hover:text-primary"
            onClick={() => selectProject(null)}
          >
            项目
          </button>
          {project && (
            <>
              <ChevronRight size={13} />
              <span className="truncate text-xs text-foreground">
                {project.name}
              </span>
            </>
          )}
        </header>
        <main className="workspace-content">
          {error && (
            <div className="mb-6">
              <ErrorNotice text={error} />
            </div>
          )}
          <div className="workspace-heading">
            <div className="min-w-0">
              {project && (
                <button
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => selectProject(null)}
                >
                  <ArrowLeft size={13} />
                  所有项目
                </button>
              )}
              <h1>{project ? project.name : '我的项目'}</h1>
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
                <Plus />
                {project ? '新建剧集' : '新建项目'}
              </Button>
            </div>
          </div>
          <div className="workspace-toolbar">
            <div className="workspace-search">
              <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label={project ? '搜索剧集' : '搜索项目'}
                className="bg-white pl-9"
                placeholder={project ? '搜索剧集' : '搜索项目'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {project ? (
              <FilterSelect
                label="筛选状态"
                value={filter}
                onValueChange={setFilter}
                options={[
                  { value: 'ALL', label: '全部状态' },
                  ...EPISODE_STATUSES.map((value) => ({
                    value,
                    label: statuses[value]
                  }))
                ]}
              />
            ) : (
              <FilterSelect
                label="项目排序"
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: 'updated', label: '最近更新' },
                  { value: 'name', label: '项目名称' }
                ]}
              />
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-white"
              aria-label="刷新列表"
              disabled={project ? episodes === null && !episodeError : loading}
              onClick={project ? reloadEpisodes : reloadProjects}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <span className="collection-count" role="status">
            {project
              ? episodes === null
                ? '剧集列表'
                : `${episodes.length} 个剧集`
              : loading
                ? '项目列表'
                : `${projects.length} 个项目`}
          </span>
          {loading ? (
            <Loading />
          ) : loadError ? (
            <ErrorNotice text={loadError} retry={reloadProjects} />
          ) : project ? (
            episodeError ? (
              <ErrorNotice text={episodeError} retry={reloadEpisodes} />
            ) : episodes === null ? (
              <Loading />
            ) : visibleEpisodes.length ? (
              <section aria-label="剧集列表" className="episode-list">
                <div className="episode-columns" aria-hidden="true">
                  <span>集序</span>
                  <span>剧集名称</span>
                  <span>状态</span>
                  <span className="episode-date">最近更新</span>
                  <span />
                </div>
                {visibleEpisodes.map((item) => (
                  <div
                    data-testid="episode-row"
                    key={item.id}
                    className="episode-row"
                  >
                    <span className="episode-number">
                      {String(episodes.indexOf(item) + 1).padStart(2, '0')}
                    </span>
                    <button
                      className="min-w-0 truncate text-left text-sm font-medium hover:text-primary"
                      onClick={() =>
                        openEditor({ mode: 'edit-episode', episode: item })
                      }
                    >
                      {item.title}
                    </button>
                    <span
                      className="episode-status status-badge"
                      data-status={item.status}
                    >
                      {statuses[item.status]}
                    </span>
                    <span className="episode-date text-xs text-muted-foreground">
                      {date(item.updatedAt)}
                    </span>
                    <div className="episode-actions">
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
                        <DropdownMenuContent>
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
                            className="text-destructive"
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <Empty
                icon="episode"
                title={
                  query || filter !== 'ALL' ? '没有找到剧集' : '还没有剧集'
                }
                action={query || filter !== 'ALL' ? '清除筛选' : '新建剧集'}
                onAction={() =>
                  query || filter !== 'ALL'
                    ? (setQuery(''), setFilter('ALL'))
                    : openEditor({ mode: 'create-episode' })
                }
              />
            )
          ) : visibleProjects.length ? (
            <section aria-label="项目列表" className="project-list">
              <div className="project-columns" aria-hidden="true">
                <span>项目名称</span>
                <span>最近更新</span>
                <span />
              </div>
              {visibleProjects.map((item) => (
                <article key={item.id} className="project-entry">
                  <button
                    className="project-open"
                    aria-label={item.name}
                    title={item.name}
                    onClick={() => selectProject(item.id)}
                  >
                    <FolderClosed
                      className="project-icon"
                      size={22}
                      aria-hidden="true"
                    />
                    <span className="project-details">
                      <span className="project-name">{item.name}</span>
                      <span className="project-created">
                        更新于 {date(item.updatedAt)}
                      </span>
                    </span>
                    <span className="project-updated">
                      {date(item.updatedAt)}
                    </span>
                  </button>
                  <div className="project-actions">{projectMenu(item)}</div>
                </article>
              ))}
            </section>
          ) : (
            <Empty
              icon="project"
              title={query ? '没有找到项目' : '还没有项目'}
              action={query ? '清除搜索' : undefined}
              onAction={() => setQuery('')}
            />
          )}
        </main>
      </div>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null)
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <DialogTitle className="pr-7 text-lg font-semibold">
            {editorTitle}
          </DialogTitle>
          <DialogDescription
            className={
              deleting
                ? 'break-words text-sm leading-6 text-muted-foreground'
                : 'sr-only'
            }
          >
            {deleting
              ? `“${editor && 'project' in editor ? editor.project.name : editor && 'episode' in editor ? editor.episode.title : ''}”${isProjectEditor ? '及其全部剧集' : ''}将被删除，无法恢复。`
              : isProjectEditor
                ? '填写项目名称。'
                : '填写剧集名称并设置状态。'}
          </DialogDescription>
          <form className="grid gap-5" onSubmit={(event) => void save(event)}>
            {!deleting && (
              <>
                <label className="field" htmlFor="item-name">
                  {isProjectEditor ? '项目名称' : '剧集名称'}
                  <Input
                    id="item-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={isProjectEditor ? 80 : 200}
                    disabled={busy}
                    autoFocus
                  />
                </label>
                {!isProjectEditor && (
                  <label className="field" htmlFor="episode-status">
                    状态
                    <select
                      id="episode-status"
                      aria-label="状态"
                      className="native-select h-10"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as EpisodeStatus)
                      }
                      disabled={busy}
                    >
                      {EPISODE_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {statuses[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {formError && <ErrorNotice text={formError} />}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant={deleting ? 'destructive' : 'default'}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" />
                ) : !deleting && !editor?.mode.startsWith('create') ? (
                  <Check />
                ) : null}
                {deleting
                  ? '删除'
                  : editor?.mode === 'create-project'
                    ? '创建项目'
                    : editor?.mode === 'create-episode'
                      ? '创建剧集'
                      : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle className="size-4 animate-spin" />
      正在加载
    </div>
  )
}
function Empty({
  icon,
  title,
  action,
  onAction
}: {
  icon: 'project' | 'episode'
  title: string
  action: string | undefined
  onAction: () => void
}) {
  const Icon = icon === 'project' ? FolderOpen : Film
  return (
    <div className="empty-state">
      <Icon className="empty-icon" size={30} strokeWidth={1.3} />
      <div className="empty-copy">
        <h2>{title}</h2>
        <p>
          {action?.startsWith('清除')
            ? '试试其他关键词，或清除当前筛选。'
            : icon === 'project'
              ? '为你的故事新建一个项目，再逐集展开。'
              : '从第一集开始，为故事安排一个开场。'}
        </p>
      </div>
      {action && (
        <Button variant="outline" onClick={onAction}>
          {action.startsWith('新建') && <Plus />}
          {action}
        </Button>
      )}
    </div>
  )
}

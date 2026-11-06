import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeSwitcher } from './theme-switcher'
export function DashboardLayout({
  children,
  email,
  focusSearch
}: {
  children: ReactNode
  email: string
  focusSearch: () => void
}) {
  return (
    <SidebarInset
      className={cn(
        '[html[data-content-layout=centered]_&>*]:mx-auto',
        '[html[data-content-layout=centered]_&>*]:w-full',
        '[html[data-content-layout=centered]_&>*]:max-w-screen-2xl',
        'peer-data-[variant=inset]:border',
        '[--dashboard-header-height:--spacing(12)]',
        'min-w-0 overflow-x-clip'
      )}
    >
      <header
        className={cn(
          'flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
          // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
          '[html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:backdrop-blur-md'
        )}
      >
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1" aria-label="打开导航" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            />
            <Button variant="link" onClick={focusSearch}>
              <Search data-icon="inline-start" />
              搜索项目
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />

            <Avatar>
              <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
        {children}
      </div>
    </SidebarInset>
  )
}

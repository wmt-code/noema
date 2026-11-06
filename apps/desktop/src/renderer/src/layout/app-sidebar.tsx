import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'
export function AppSidebar({
  children,
  email,
  onHome,
  logout,
  busy
}: {
  children: ReactNode
  email: string
  onHome: () => void
  logout: () => void
  busy: boolean
}) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onHome} aria-label="Noema 工作台">
              <img className="size-4" src="./brand/icon-48.png" alt="" />
              <span className="text-base font-semibold">Noema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter>
        <NavUser email={email} logout={logout} busy={busy} />
      </SidebarFooter>
    </Sidebar>
  )
}

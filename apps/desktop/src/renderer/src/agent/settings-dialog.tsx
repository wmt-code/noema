'use client'

import * as React from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { KeyRound, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@/components/ui/sidebar'
export type SettingsSection = 'keys' | 'project'
const navigation = [
  { id: 'keys', name: '账号密钥', icon: <KeyRound /> },
  { id: 'project', name: '项目模型', icon: <Settings2 /> }
] as const
type Props = {
  section: SettingsSection
  hasProject: boolean
  busy: boolean
  onSection: (v: SettingsSection) => void
  onClose: () => void
  children: React.ReactNode
}
export function SettingsDialog({
  section,
  hasProject,
  busy,
  onSection,
  onClose,
  children
}: Props) {
  const items = navigation.map((item) => ({
    ...item,
    name: !hasProject && item.id === 'project' ? '独立对话模型' : item.name
  }))
  const title = items.find((item) => item.id === section)?.name
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="transition-[opacity,transform] max-h-[90dvh] overflow-hidden p-0 sm:max-w-[700px] lg:max-w-[800px]"
      >
        <DialogTitle className="sr-only">模型与 Agent 设置</DialogTitle>
        <DialogDescription className="sr-only">
          管理账号密钥及当前项目的模型配置。
        </DialogDescription>
        <SidebarProvider className="min-h-0 items-stretch [--sidebar-width:11rem]">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          disabled={busy}
                          onClick={() => onSection(item.id)}
                          isActive={item.id === section}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <div className="flex h-[min(600px,88dvh)] min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <div className="hidden md:block">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        模型设置
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{title}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
                <Select
                  disabled={busy}
                  value={section}
                  onValueChange={(value) => onSection(value as SettingsSection)}
                >
                  <SelectTrigger aria-label="设置分类" className="md:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}

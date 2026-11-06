'use client'

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'

type LogisticsProps = {
  list: React.ReactNode
  details: React.ReactNode
  title: string
  detailsOpen: boolean
  setDetailsOpen: (open: boolean) => void
}
export function Logistics({
  list,
  details,
  title,
  detailsOpen,
  setDetailsOpen
}: LogisticsProps) {
  const previousFocus = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => {
      if (desktop.matches) setDetailsOpen(false)
    }
    desktop.addEventListener('change', onResize)
    return () => desktop.removeEventListener('change', onResize)
  }, [setDetailsOpen])
  return (
    <>
      <div
        data-content-padding="false"
        className="grid h-[calc(100dvh-var(--dashboard-header-height))] overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)] lg:divide-x"
      >
        <div className="h-full overflow-hidden">{list}</div>
        <div className="hidden h-full overflow-hidden lg:block">
          {!detailsOpen && details}
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          onOpenAutoFocus={() => {
            previousFocus.current = document.activeElement as HTMLElement | null
          }}
          onCloseAutoFocus={(event) => {
            if (previousFocus.current?.isConnected) {
              event.preventDefault()
              previousFocus.current.focus()
            }
          }}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-3/4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>所选项目的剧集内容与项目信息。</SheetDescription>
          </SheetHeader>
          {details}
        </SheetContent>
      </Sheet>
    </>
  )
}

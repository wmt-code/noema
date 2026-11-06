'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
export function ThemeSwitcher() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  function cycleTheme() {
    setDark(!dark)
    try {
      localStorage.setItem('noema:theme', dark ? 'light' : 'dark')
    } catch {
      /* Storage is optional. */
    }
  }
  return (
    <Button
      size="icon"
      onClick={cycleTheme}
      aria-label={dark ? '切换浅色主题' : '切换深色主题'}
    >
      {/* DARK (resolved) */}
      <Sun className="hidden dark:block" />

      {/* LIGHT (resolved) */}
      <Moon className="block dark:hidden" />
    </Button>
  )
}

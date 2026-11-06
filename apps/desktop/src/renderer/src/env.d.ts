import type { DesktopApi } from '../../shared/api'

declare global {
  // Radix's optional server scheduler is referenced by its declarations only.
  const setImmediate: (callback: () => void) => unknown
  interface Window {
    noema: DesktopApi
  }
}

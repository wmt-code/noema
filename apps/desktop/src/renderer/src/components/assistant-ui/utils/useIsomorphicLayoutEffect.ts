// Source: assistant-ui/assistant-ui 3a61e1df (MIT), packages/ui.
import { useEffect, useLayoutEffect } from 'react'

const hasWindow =
  typeof (globalThis as typeof globalThis & { window?: unknown }).window !==
  'undefined'

export const useIsomorphicLayoutEffect = hasWindow ? useLayoutEffect : useEffect

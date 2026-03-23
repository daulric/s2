'use client'

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  startTransition,
  type ReactNode,
} from 'react'
import { useSignals, useSignal } from '@preact/signals-react/runtime'
import { useRouter, usePathname } from 'next/navigation'

interface NavigationContextType {
  previousPage: string
  navigationHistory: string[]
  goToPreviousPage: () => void
  goBack: (steps?: number) => void
  canGoBack: (steps?: number) => boolean
  isExcludedPage: (path: string) => boolean
}

interface NavigationProviderProps {
  children: ReactNode
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

const excludedPatterns: RegExp[] = [
  /^\/auth\/.*/,
  /^\/admin\/.*/,
  /^\/api\/.*/,
  /^\/(login|signup|forgot-password|reset-password)$/,
]

const isExcludedPage = (path: string): boolean => {
  return excludedPatterns.some((pattern) => pattern.test(path))
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  useSignals()
  const previousPage = useSignal<string>('/')
  const navigationHistory = useSignal<string[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    if (isExcludedPage(pathname)) return

    startTransition(() => {
      const prev = previousPage.value
      if (prev === '/' || prev === pathname) {
        previousPage.value = pathname
      }

      const hist = navigationHistory.value
      const lastEntry = hist[hist.length - 1]
      if (lastEntry !== pathname) {
        navigationHistory.value = [...hist, pathname].slice(-10)
      }
    })
  }, [pathname, previousPage, navigationHistory])

  const goToPreviousPage = useCallback((): void => {
    const prev = previousPage.value
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    if (prev && prev !== currentPath && !isExcludedPage(prev)) {
      router.push(prev)
    } else {
      router.push('/')
    }
  }, [router, previousPage])

  const goBack = useCallback((steps: number = 1): void => {
    const hist = navigationHistory.value
    const targetIndex = hist.length - 1 - steps
    if (targetIndex >= 0 && hist[targetIndex]) {
      const targetPage = hist[targetIndex]
      if (!isExcludedPage(targetPage)) {
        router.push(targetPage)
      } else {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [router, navigationHistory])

  const canGoBack = useCallback((steps: number = 1): boolean => {
    const hist = navigationHistory.value
    const targetIndex = hist.length - 1 - steps
    const targetPage = hist[targetIndex]
    return targetIndex >= 0 && Boolean(targetPage) && !isExcludedPage(targetPage)
  }, [navigationHistory])

  const value: NavigationContextType = {
    previousPage: previousPage.value,
    navigationHistory: navigationHistory.value,
    goToPreviousPage,
    goBack,
    canGoBack,
    isExcludedPage,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

export function usePreviousPage(): string {
  const { previousPage } = useNavigation()
  return previousPage
}

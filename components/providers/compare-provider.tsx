'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

const MAX_COMPARE = 3
const STORAGE_KEY = 'rac_compare'

export type CompareItem = {
  id: string
  slug: string
  name: string
  logo_url: string | null
}

type CompareContextValue = {
  items: CompareItem[]
  add: (item: CompareItem) => void
  remove: (id: string) => void
  clear: () => void
  isInCompare: (id: string) => boolean
  isFull: boolean
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CompareItem[]
        if (Array.isArray(parsed)) setItems(parsed.slice(0, MAX_COMPARE))
      }
    } catch {
      // ignore parse errors
    }
    setMounted(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, mounted])

  const add = useCallback((item: CompareItem) => {
    setItems((prev) => {
      if (prev.length >= MAX_COMPARE) return prev
      if (prev.some((i) => i.id === item.id)) return prev
      return [...prev, item]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const isInCompare = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  )

  return (
    <CompareContext.Provider
      value={{
        items,
        add,
        remove,
        clear,
        isInCompare,
        isFull: items.length >= MAX_COMPARE,
      }}
    >
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used within CompareProvider')
  return ctx
}

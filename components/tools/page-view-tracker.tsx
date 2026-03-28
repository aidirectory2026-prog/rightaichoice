'use client'

import { useEffect, useRef } from 'react'
import { recordPageView } from '@/actions/tools'

export function PageViewTracker({ path, toolId }: { path: string; toolId?: string }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    recordPageView(path, toolId).catch(() => {})
  }, [path, toolId])

  return null
}

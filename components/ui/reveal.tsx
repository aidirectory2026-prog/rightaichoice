'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  delayMs?: number
  className?: string
  as?: 'div' | 'section' | 'article'
}

/**
 * Fades + slides children in when they scroll into view.
 * Zero-dep, IntersectionObserver-based, SSR-safe, prefers-reduced-motion honored.
 * Step 45 Slice 2.
 */
export function Reveal({ children, delayMs = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    let reveal: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // brief delay so browser paints the initial (opacity:0) frame
            // before transitioning — guarantees the user sees the motion.
            reveal = setTimeout(() => setVisible(true), 120)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' }
    )
    io.observe(node)
    // Safety net: never leave sections stuck at opacity:0.
    const fallback = setTimeout(() => setVisible(true), 4000)
    return () => {
      io.disconnect()
      if (reveal) clearTimeout(reveal)
      clearTimeout(fallback)
    }
  }, [])

  const style = delayMs ? { transitionDelay: `${delayMs}ms` } : undefined
  const merged = `reveal ${className}`.trim()

  if (as === 'section') {
    return (
      <section
        ref={ref as React.RefObject<HTMLElement>}
        className={merged}
        data-visible={visible ? 'true' : undefined}
        style={style}
      >
        {children}
      </section>
    )
  }
  if (as === 'article') {
    return (
      <article
        ref={ref as React.RefObject<HTMLElement>}
        className={merged}
        data-visible={visible ? 'true' : undefined}
        style={style}
      >
        {children}
      </article>
    )
  }
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={merged}
      data-visible={visible ? 'true' : undefined}
      style={style}
    >
      {children}
    </div>
  )
}

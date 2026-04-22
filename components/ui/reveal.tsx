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
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px 160px 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
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

'use client'

// Phase 10.4.2 — admin sidebar. Renders entirely from lib/admin/nav.ts
// (IA as data). Desktop: sticky left rail with collapsible sections
// (collapsed-set persisted in localStorage). Mobile (<lg): hamburger in the
// header opens a slide-over drawer with the same nav.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { ADMIN_NAV, matchNavEntry } from '@/lib/admin/nav'
import { Logo } from '@/components/shared/logo'

const STORAGE_KEY = 'rac-admin-sidebar-collapsed'

function loadCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(arr) ? arr.filter((t): t is string => typeof t === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveCollapsed(set: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    /* private mode etc. — non-fatal */
  }
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = matchNavEntry(pathname ?? '')
  // Render expanded on the server, apply the persisted collapsed-set after
  // hydration — avoids SSR/client markup mismatch.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  useEffect(() => {
    setCollapsed(loadCollapsed())
  }, [])

  function toggle(title: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      saveCollapsed(next)
      return next
    })
  }

  return (
    <nav className="px-2 py-3" aria-label="Admin sections">
      {ADMIN_NAV.map((section) => {
        const isCollapsed = collapsed.has(section.title)
        const containsActive = active?.section.title === section.title
        return (
          <div key={section.title} className="mb-1">
            <button
              type="button"
              onClick={() => toggle(section.title)}
              aria-expanded={!isCollapsed}
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-zinc-200 ${
                containsActive ? 'text-emerald-500' : 'text-zinc-500'
              }`}
            >
              {section.title}
              <ChevronDown
                className={`h-3 w-3 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                aria-hidden
              />
            </button>
            {!isCollapsed && (
              <ul className="mt-0.5 space-y-0.5">
                {section.items.map((item) => {
                  const isActive = active?.item.href === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={item.description}
                        aria-current={isActive ? 'page' : undefined}
                        className={`block truncate rounded px-2 py-1.5 text-[13px] transition-colors ${
                          isActive
                            ? 'bg-emerald-950/50 font-medium text-emerald-300'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4">
      <Logo size="sm" />
      <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Admin
      </span>
    </div>
  )
}

/** Desktop sidebar — hidden below lg. */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  )
}

/** Mobile hamburger + slide-over drawer — hidden at lg and up. */
export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer on any route change (safety net alongside onNavigate).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin navigation"
        className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      {/* The drawer MUST be portalled to <body>. The admin header that holds
          this component has `backdrop-blur-sm` (a backdrop-filter), which makes
          it the containing block for `position:fixed` descendants — so a
          `fixed inset-0` drawer rendered inline here collapses to the 56px
          header box instead of the viewport, and the menu appears not to open
          (confirmed: trapped element measured 390×56 vs the intended 390×844).
          Portalling to document.body escapes the filtered ancestor so `fixed`
          resolves against the viewport again. */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 shadow-xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
                <div className="flex items-center gap-2.5">
                  <Logo size="sm" />
                  <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close admin navigation"
                  className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

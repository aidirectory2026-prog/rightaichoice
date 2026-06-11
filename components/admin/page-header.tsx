'use client'

// Phase 10.4.2 — breadcrumb + page header, derived from lib/admin/nav.ts so
// the trail always matches the sidebar IA. AdminBreadcrumb lives in the
// layout's header bar; PageHeader is for pages that want a titled header row
// with a right-aligned slot (actions, range pickers — Phase 5 adoption).

import { usePathname } from 'next/navigation'
import { matchNavEntry } from '@/lib/admin/nav'

/** "Section / Page" trail for the current route, from the nav data. */
export function AdminBreadcrumb() {
  const pathname = usePathname()
  const entry = matchNavEntry(pathname ?? '')
  if (!entry) {
    return <span className="truncate text-sm font-semibold text-white">Admin</span>
  }
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-zinc-500">{entry.section.title}</span>
      <span className="text-zinc-700" aria-hidden>
        /
      </span>
      <span className="truncate font-semibold text-white">{entry.item.label}</span>
    </span>
  )
}

/** Breadcrumb-led page header with a right-aligned slot. */
export function PageHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <AdminBreadcrumb />
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}

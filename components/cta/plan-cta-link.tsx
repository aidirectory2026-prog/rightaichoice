'use client'

/**
 * F3 (metric-audit.md) — tracked <Link> to /plan for server components.
 *
 * Several server-rendered surfaces (homepage sections, content pages) link
 * straight to /plan with a plain <Link>, so those navigations never fired
 * plan_cta_clicked and the plan-conversion funnel's step 2 read ~0 CTR
 * against 852 impressions/wk. This is the minimal client wrapper: same
 * Link, plus the funnel event on click. Surfaces reuse the canonical enum
 * consumed by /admin/plan-conversion.
 */

import Link from 'next/link'
import { type ReactNode } from 'react'
import { analytics } from '@/lib/analytics'

type Surface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'

export function PlanCTALink({
  surface,
  pagePath,
  href = '/plan',
  className,
  children,
}: {
  surface: Surface
  /** Page the link is rendered on (event prop page_path). */
  pagePath: string
  href?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => analytics.planCtaClicked({ surface, page_path: pagePath })}
    >
      {children}
    </Link>
  )
}

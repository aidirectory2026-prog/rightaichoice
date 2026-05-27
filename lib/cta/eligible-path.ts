/**
 * Phase 9 — Plan-Your-Stack CTA path eligibility.
 *
 * Single source of truth for "should this page show the global CTA?".
 * Used by both PlanCTASticky (layout-mounted) and PlanCTAInline (per-page).
 *
 * Per the Phase 9 plan: every page EXCEPT the exact URLs linked from the
 * footer + auth/admin/embed routes. Dynamic detail pages under those
 * paths (e.g. /tools/[slug], /blog/[slug]) still get the CTA because they
 * are the actual research surfaces where conversion should happen.
 */

// Footer-linked top-level URLs + legal/about. Exact match.
const EXCLUDED_EXACT: ReadonlySet<string> = new Set([
  '/',                  // homepage already has the hero input — no double CTA
  '/tools',
  '/categories',
  '/search',
  '/plan',              // the planner itself — destination, not source
  '/compare',
  '/best',
  '/stacks',
  '/blog',
  '/methodology',
  '/viability',
  '/about',
  '/team',
  '/privacy',
  '/terms',
  '/unsubscribe',
])

// Prefix-match exclusions (auth, admin, embed, the planner sub-routes,
// dashboard, saved). These never show the CTA at any depth.
const EXCLUDED_PREFIXES: readonly string[] = [
  '/admin',
  '/auth',
  '/login',
  '/signup',
  '/forgot-password',
  '/update-password',
  '/embed',
  '/dashboard',
  '/saved',
  '/plan/',             // any sub-route of the planner
  '/api',
]

export function isEligibleForCTA(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Strip trailing slash + query for matching consistency.
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/'
  if (EXCLUDED_EXACT.has(path)) return false
  for (const prefix of EXCLUDED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix)) {
      // Use startsWith with the prefix string; '/admin' will match both
      // '/admin' and '/admin/anything' but won't match '/administrator'.
      if (path === prefix || path.startsWith(prefix + '/')) return false
    }
  }
  return true
}

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

/**
 * Phase 6.3 (2026-05-11): shared breadcrumbs component used on listing
 * and utility pages (/tools, /search, /plan, etc.). Emits both the
 * visual breadcrumb nav and the BreadcrumbList JSON-LD so SEO + UX
 * stay aligned. Tool/category/compare detail pages already inline
 * their own JSON-LD via breadcrumbJsonLd; this component is for the
 * pages that didn't have either yet.
 *
 * JSON-LD payload is built from route-controlled inputs only (page
 * paths + heading strings hard-coded by the caller). Same emit shape
 * as every other JSON-LD script in this app — see app/tools/[slug]/
 * page.tsx and app/categories/[slug]/page.tsx for parallel call sites.
 */
export function Breadcrumbs({
  crumbs,
}: {
  crumbs: Array<{ name: string; url: string }>
}) {
  if (crumbs.length === 0) return null
  const jsonLd = JSON.stringify(breadcrumbJsonLd(crumbs))
  const last = crumbs[crumbs.length - 1]
  const upstream = crumbs.slice(0, -1)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500"
      >
        {upstream.map((c) => (
          <span key={c.url} className="flex items-center gap-1.5">
            <Link href={c.url} className="hover:text-white transition-colors">
              {c.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ))}
        <span className="text-zinc-300">{last.name}</span>
      </nav>
    </>
  )
}

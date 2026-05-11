import Link from 'next/link'
import { cookies } from 'next/headers'
import { Clock } from 'lucide-react'
import { getToolsBySlugs } from '@/lib/data/tools'

const COOKIE_NAME = 'rac_recent'

/**
 * Phase 6.4 (2026-05-11): server component that reads the 'rac_recent'
 * cookie set by <RecordRecentView> on tool pages, fetches the matching
 * tool rows in cookie order, and renders a compact rail. Renders null
 * (no section, no header) when the cookie is empty or all entries are
 * stale/unpublished — first-time visitors don't see a sad "no recent
 * tools" placeholder.
 *
 * Mount on homepage + /tools index. Self-fetches; pass `excludeSlug`
 * if you want to hide a specific slug (e.g. when mounted on a tool
 * detail page that's already in the cookie).
 */
export async function RecentlyViewed({
  limit = 5,
  excludeSlug,
}: {
  limit?: number
  excludeSlug?: string
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  let slugs: string[] = []
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (Array.isArray(parsed)) {
      slugs = parsed
        .filter((s): s is string => typeof s === 'string')
        .filter((s) => s !== excludeSlug)
        .slice(0, limit)
    }
  } catch {
    // Malformed cookie — silently render nothing rather than crashing
    // the homepage. The tool-page client component will overwrite with
    // a clean value next time the user visits any tool page.
    return null
  }

  if (slugs.length === 0) return null

  const tools = await getToolsBySlugs(slugs)
  if (tools.length === 0) return null

  return (
    <section className="border-t border-zinc-900/50 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            Recently viewed
          </h2>
          <Link
            href="/tools"
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Browse all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <div className="flex items-center gap-2">
                {tool.logo_url ? (
                  // Logos can be hot-linked or self-hosted; either way we
                  // lazy-load via the browser default.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tool.logo_url}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-md bg-zinc-800 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-md bg-zinc-800" />
                )}
                <span className="truncate text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
                  {tool.name}
                </span>
              </div>
              {tool.tagline && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500 leading-snug">
                  {tool.tagline}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

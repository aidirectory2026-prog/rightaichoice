export const revalidate = 0 // always fresh — user-personal data

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { createClient } from '@/lib/supabase/server'
import { getSavedTools } from '@/lib/data/tools'

export const metadata: Metadata = {
  title: 'Saved tools',
  description: 'Your saved AI tool shortlist on RightAIChoice.',
  // Phase 6.2 (2026-05-11): per-user surface, noindex so search engines
  // don't crawl an empty-shell version. Tool detail pages remain the SEO
  // entry points.
  robots: { index: false, follow: false },
}

export default async function SavedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gated route. Push unauthenticated visitors to /login with `next` (the param
  // /login actually reads — `returnTo` was silently ignored → dumped users on
  // /dashboard) so they land back here post-signin.
  if (!user) {
    redirect('/login?next=/saved')
  }

  const tools = await getSavedTools(user.id)

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-emerald-400 fill-emerald-400" />
                Saved tools
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {tools.length === 0
                  ? 'Your shortlist is empty.'
                  : `${tools.length} tool${tools.length === 1 ? '' : 's'} bookmarked.`}
              </p>
            </div>
            {tools.length > 0 && (
              <Link
                href="/tools"
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Browse more →
              </Link>
            )}
          </div>

          {tools.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Bookmark className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-lg text-zinc-300">No saved tools yet.</p>
      <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
        Tap the <span className="text-zinc-300 font-medium">Save</span> button on any tool page
        to keep a shortlist while you compare options.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/tools"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
        >
          Browse all tools
        </Link>
        <Link
          href="/plan"
          className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-900/40 transition-colors"
        >
          Plan My Stack
        </Link>
      </div>
    </div>
  )
}

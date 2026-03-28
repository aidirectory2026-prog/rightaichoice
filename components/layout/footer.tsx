import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              The decision-making engine for discovering AI tools.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Discover
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/tools" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Browse Tools
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/tools?sort=trending" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Trending
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Community
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/reviews" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Reviews
                </Link>
              </li>
              <li>
                <Link href="/questions" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Q&A
                </Link>
              </li>
              <li>
                <Link href="/discussions" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Discussions
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Platform
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-zinc-500 hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} RightAIChoice. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Built for the AI community.
          </p>
        </div>
      </div>
    </footer>
  )
}

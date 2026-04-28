'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/shared/logo'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import { Menu, X, LayoutDashboard, LogIn, UserPlus, Sparkles, GitCompareArrows, Award, FolderOpen, Briefcase, BookOpen } from 'lucide-react'
import { analytics } from '@/lib/analytics'

export function Navbar() {
  const { user, profile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Phase 7 Step 58 (BUG-019): shared `useAuthHref` hook replaces the inline
  // `authHref()` helper that used to live here. Same redirect-back contract,
  // one source of truth for every "Sign in to X" CTA in the app.
  const loginHref = useAuthHref('/login')
  const signupHref = useAuthHref('/signup')

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/plan"
              onClick={() => analytics.navCtaClicked('plan_your_stack', 'navbar_desktop')}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Plan Your Stack
            </Link>
            <Link
              href="/tools"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Browse Tools
            </Link>
            <Link
              href="/compare"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              Compare
            </Link>
            <Link
              href="/best"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Award className="h-3.5 w-3.5" />
              Best For...
            </Link>
            <Link
              href="/for"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" />
              By Role
            </Link>
            <Link
              href="/categories"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Categories
            </Link>
            <Link
              href="/blog"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Blog
            </Link>
          </div>
        </div>

        {/* Right: Auth actions */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              {profile?.username ?? 'Dashboard'}
            </Link>
          ) : (
            <>
              <Link
                href={loginHref}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href={signupHref}
                onClick={() => analytics.signupStarted('navbar_desktop')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden inline-flex h-11 w-11 items-center justify-center text-zinc-400 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3">
          <Link
            href="/plan"
            onClick={() => {
              analytics.navCtaClicked('plan_your_stack', 'navbar_mobile')
              setMobileOpen(false)
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 py-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plan Your Stack
          </Link>
          <Link
            href="/tools"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-2"
          >
            Browse Tools
          </Link>
          <Link
            href="/compare"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare
          </Link>
          <Link
            href="/best"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <Award className="h-3.5 w-3.5" />
            Best For...
          </Link>
          <Link
            href="/for"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <Briefcase className="h-3.5 w-3.5" />
            By Role
          </Link>
          <Link
            href="/categories"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Categories
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </Link>
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3.5 py-2 text-sm font-medium text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                {profile?.username ?? 'Dashboard'}
              </Link>
            ) : (
              <>
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3.5 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href={signupHref}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white text-center"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

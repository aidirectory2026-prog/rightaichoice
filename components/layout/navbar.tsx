'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/shared/logo'
import { useAuth } from '@/components/providers/auth-provider'
import { Menu, X, LayoutDashboard, LogIn, UserPlus, Sparkles, Wand2, GitBranch } from 'lucide-react'

export function Navbar() {
  const { user, profile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/tools"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Browse Tools
            </Link>
            <Link
              href="/categories"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/questions"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Q&A
            </Link>
            <Link
              href="/recommend"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Find My Tool
            </Link>
            <Link
              href="/workflows"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Workflows
            </Link>
            <Link
              href="/plan"
              className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Planner
            </Link>
            <Link
              href="/ai-chat"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              AI Chat
            </Link>
          </div>
        </div>

        {/* Right: Auth actions */}
        <div className="hidden md:flex items-center gap-3">
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
                href="/login"
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href="/signup"
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
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3">
          <Link
            href="/tools"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-2"
          >
            Browse Tools
          </Link>
          <Link
            href="/categories"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-2"
          >
            Categories
          </Link>
          <Link
            href="/questions"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-2"
          >
            Q&A
          </Link>
          <Link
            href="/recommend"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Find My Tool
          </Link>
          <Link
            href="/workflows"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Workflows
          </Link>
          <Link
            href="/plan"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 py-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Planner
          </Link>
          <Link
            href="/ai-chat"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white py-2"
          >
            AI Chat
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
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3.5 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ROLE_PAGES } from '@/lib/data/role-pages'
import { breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'AI Tools by Role & Profession — RightAIChoice',
  description:
    'Find the best AI tools for your profession. Curated AI toolkits for developers, marketers, designers, freelancers, founders, educators, and 15+ other roles.',
  openGraph: {
    title: 'AI Tools by Role & Profession',
    description:
      'Find the best AI tools for your profession. Curated toolkits for 20+ roles.',
    url: 'https://rightaichoice.com/for',
  },
  alternates: {
    canonical: 'https://rightaichoice.com/for',
  },
}

export default function RolesIndexPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'AI Tools by Role', url: '/for' },
  ])

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbs)} />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <div className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">AI Tools by Role</span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Find the Right AI Tools for Your Role
            </h1>
            <p className="mt-3 text-zinc-400 leading-relaxed max-w-2xl">
              Every profession has different AI needs. We have curated the best tools for {ROLE_PAGES.length} roles
              — from content creators and developers to lawyers and data scientists.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_PAGES.map((role) => (
              <Link
                key={role.slug}
                href={`/for/${role.slug}`}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200"
              >
                <h2 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {role.h1}
                </h2>
                <p className="mt-2 text-sm text-zinc-500 line-clamp-2 flex-1">
                  {role.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  View tools
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Don&apos;t see your role?
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
              Tell our AI planner what you do and get a personalized tool stack in seconds.
            </p>
            <Link
              href="/plan"
              className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Plan Your Stack
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

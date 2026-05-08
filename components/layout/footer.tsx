import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

// Phase 4.5 audit fix (2026-05-09): re-org from 3 columns
// (Discover / Editorial / Company) to canonical 4-column structure
// per the Phase 8 spec: Product / Resources / Company / Legal. The
// COMMUNITY anti-requirement is preserved — no Community column anywhere.
//
// Routes that don't exist yet (/contact, /affiliate-disclosure) were
// dropped from the link list to avoid 404s. Add them back here when the
// pages ship. Routes that survived from the old footer (/tools,
// /categories, /best, /methodology, etc.) keep working from any old
// inbound links.

const PRODUCT_LINKS: Array<{ href: string; label: string }> = [
  { href: '/tools', label: 'Browse tools' },
  { href: '/categories', label: 'Categories' },
  { href: '/search', label: 'Search' },
  { href: '/plan', label: 'Plan my stack' },
  { href: '/compare', label: 'Compare' },
]

const RESOURCES_LINKS: Array<{ href: string; label: string }> = [
  { href: '/best', label: 'Best AI guides' },
  { href: '/stacks', label: 'Stacks' },
  { href: '/blog', label: 'Blog' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/viability', label: 'Viability scoring' },
]

const COMPANY_LINKS: Array<{ href: string; label: string }> = [
  { href: '/about', label: 'About' },
  { href: '/team', label: 'Team' },
]

const LEGAL_LINKS: Array<{ href: string; label: string }> = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

function FooterColumn({
  heading,
  links,
}: {
  heading: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {heading}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand strip — sits above the link columns so it has room to breathe */}
        <div className="mb-10 max-w-md">
          <Logo size="sm" />
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
            The decision-making engine for discovering AI tools.
          </p>
        </div>

        {/* 4 link columns — Product / Resources / Company / Legal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <FooterColumn heading="Product" links={PRODUCT_LINKS} />
          <FooterColumn heading="Resources" links={RESOURCES_LINKS} />
          <FooterColumn heading="Company" links={COMPANY_LINKS} />
          <FooterColumn heading="Legal" links={LEGAL_LINKS} />
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

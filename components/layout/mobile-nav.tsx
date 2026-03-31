'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Layers, Sparkles, Award, GitCompareArrows } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tools', label: 'Tools', icon: Layers },
  { href: '/plan', label: 'Plan Stack', icon: Sparkles, highlight: true },
  { href: '/best', label: 'Best For', icon: Award },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, highlight }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[11px] font-medium transition-colors min-h-[44px]',
                highlight
                  ? isActive
                    ? 'text-emerald-400'
                    : 'text-emerald-500/80 hover:text-emerald-400'
                  : isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

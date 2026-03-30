'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Layers, MessageSquare, Sparkles, Wand2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tools', label: 'Tools', icon: Layers },
  { href: '/plan', label: 'AI Plan', icon: Sparkles, highlight: true },
  { href: '/questions', label: 'Q&A', icon: MessageSquare },
  { href: '/recommend', label: 'Find', icon: Wand2 },
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
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
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

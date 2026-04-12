'use client'

import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'

export function TrackedBlogLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const href = props.href ?? ''
    if (href.startsWith('/') || href.startsWith('#')) {
      const slug = pathname.replace(/^\/blog\//, '')
      analytics.blogInternalLinkClicked(slug, href)
    }
    props.onClick?.(e)
  }

  return (
    <a
      {...props}
      onClick={handleClick}
      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
    />
  )
}

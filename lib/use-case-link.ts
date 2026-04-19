import { BEST_PAGES } from '@/lib/data/best-pages'
import { ROLE_PAGES } from '@/lib/data/role-pages'

const STOP = new Set(['ai', 'tool', 'tools', 'best', 'with', 'using'])

function scan(
  text: string,
  pages: { slug: string; featureKeywords?: string[] }[],
  prefix: string,
): { href: string; score: number } | null {
  let hit: { href: string; score: number } | null = null
  for (const p of pages) {
    for (const raw of p.featureKeywords ?? []) {
      const kw = raw.toLowerCase()
      if (kw.length < 4 || STOP.has(kw)) continue
      if (text.includes(kw) && (!hit || kw.length > hit.score)) {
        hit = { href: `${prefix}/${p.slug}`, score: kw.length }
      }
    }
  }
  return hit
}

export function findUseCaseLink(useCase: string): string | null {
  const text = useCase.toLowerCase()
  return (
    scan(text, BEST_PAGES, '/best')?.href ??
    scan(text, ROLE_PAGES, '/for')?.href ??
    null
  )
}

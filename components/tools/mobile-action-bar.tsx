import { SaveToolButton } from '@/components/tools/save-tool-button'
import { VisitWebsiteButton } from '@/components/tools/visit-website-button'
import { AddToCompareButton } from '@/components/compare/add-to-compare-button'

// Phase 3b (2026-05-05): mobile-only sticky bottom action bar. Keeps the
// three highest-intent CTAs (Visit website, Save, Compare) reachable
// after the user has scrolled past the hero. Desktop already has the
// sticky right-rail at-a-glance card serving the same purpose, so this
// component is `lg:hidden` only.
//
// Layout: fixed just ABOVE the global MobileNav tab bar (which is
// `bottom-0` z-50, ~60px tall), so this action bar sits at `bottom-[60px]`
// with a higher z-index and isn't obscured by the nav. Backdrop-blurred so
// dark content underneath stays legible. The page applies `pb-20 lg:pb-0`
// to its scroll container so the last section isn't covered by the bar.

type Props = {
  tool: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    website_url: string
  }
  initialSaved: boolean
}

export function MobileActionBar({ tool, initialSaved }: Props) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-[60px] z-[60] border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex items-center gap-2 px-3 py-2.5 safe-area-bottom">
        <div className="flex-1 min-w-0">
          <VisitWebsiteButton slug={tool.slug} url={tool.website_url} toolId={tool.id} source="tool_page_mobile_bar" />
        </div>
        <SaveToolButton toolId={tool.id} toolName={tool.name} toolSlug={tool.slug} initialSaved={initialSaved} />
        <AddToCompareButton
          tool={{
            id: tool.id,
            slug: tool.slug,
            name: tool.name,
            logo_url: tool.logo_url,
          }}
          size="md"
        />
      </div>
    </div>
  )
}

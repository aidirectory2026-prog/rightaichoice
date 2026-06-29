// Phase 13 Social — public graphic render route.
//
// PUBLIC by design: Instagram's Content Publishing API requires a publicly
// reachable image URL. We expose only the rendered PNG (no DB data leaks) and
// only for posts that have a graphic. Two modes:
//   /api/social/graphic/<uuid>            → render a queued post's graphic
//   /api/social/graphic/preview?t=<tmpl>  → render sample data (admin preview)
// ?size=square|portrait|landscape overrides the size.

import { NextRequest } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { loadGeistFromOrigin, renderGraphic } from '@/lib/social/graphics/render'
import {
  GRAPHIC_SIZES,
  PLATFORM_DEFAULT_SIZE,
  SAMPLE_DATA,
  type GraphicData,
  type GraphicSizeName,
  type GraphicTemplate,
} from '@/lib/social/graphics/templates'
import type { Platform } from '@/lib/social/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TEMPLATES: GraphicTemplate[] = ['stat_card', 'tool_spotlight', 'news_roundup', 'comparison', 'quote']

function isSize(s: string | null): s is GraphicSizeName {
  return s === 'square' || s === 'portrait' || s === 'landscape'
}

type Resolved = { template: GraphicTemplate; data: GraphicData[GraphicTemplate]; size: GraphicSizeName }

async function resolvePost(id: string, sizeOverride: GraphicSizeName | null): Promise<Resolved | null> {
  const supabase = getAdminClient()
  const res = await supabase
    .from('social_posts')
    .select('platform, graphic_template, graphic_data, graphic_size')
    .eq('id', id)
    .single()
  // Admin client is untyped (generated types don't yet include social_posts) → cast.
  const row = res.data as {
    platform: Platform
    graphic_template: string | null
    graphic_data: Record<string, unknown> | null
    graphic_size: string | null
  } | null
  if (res.error || !row || !row.graphic_template) return null
  if (!TEMPLATES.includes(row.graphic_template as GraphicTemplate)) return null

  const size: GraphicSizeName =
    sizeOverride ??
    (isSize(row.graphic_size) ? row.graphic_size : PLATFORM_DEFAULT_SIZE[row.platform] ?? 'landscape')

  return {
    template: row.graphic_template as GraphicTemplate,
    data: (row.graphic_data ?? {}) as GraphicData[GraphicTemplate],
    size,
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { searchParams } = new URL(request.url)
  const sizeOverride = isSize(searchParams.get('size')) ? (searchParams.get('size') as GraphicSizeName) : null

  let resolved: Resolved | null = null

  if (id === 'preview') {
    const t = (searchParams.get('t') ?? 'stat_card') as GraphicTemplate
    const template = TEMPLATES.includes(t) ? t : 'stat_card'
    resolved = { template, data: SAMPLE_DATA[template], size: sizeOverride ?? 'square' }
  } else if (UUID_RE.test(id)) {
    resolved = await resolvePost(id, sizeOverride)
  }

  if (!resolved) {
    return new Response('Not found', { status: 404 })
  }

  const fontData = await loadGeistFromOrigin(request.nextUrl.origin)
  // Defensive: ensure the requested size is real before passing to the renderer.
  const size = resolved.size in GRAPHIC_SIZES ? resolved.size : 'landscape'
  return renderGraphic({ template: resolved.template, data: resolved.data, size, fontData })
}

// Phase 13 Social — turns a template + data into a PNG via next/og (Satori).
//
// Font is injected by the caller: the public route fetches Geist from the site
// origin; the offline render-samples script reads it from disk. If no font is
// supplied, Satori falls back to its built-in font (never 500s on a font blip).

import { ImageResponse } from 'next/og'
import {
  GRAPHIC_SIZES,
  renderTemplate,
  type GraphicData,
  type GraphicSizeName,
  type GraphicTemplate,
} from './templates'

export type RenderArgs<T extends GraphicTemplate = GraphicTemplate> = {
  template: T
  data: GraphicData[T]
  size: GraphicSizeName
  /** Geist-Regular TTF bytes; omit to use Satori's default font. */
  fontData?: ArrayBuffer | null
}

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
}

export function renderGraphic<T extends GraphicTemplate>(args: RenderArgs<T>): ImageResponse {
  const { width, height } = GRAPHIC_SIZES[args.size]
  return new ImageResponse(renderTemplate(args.template, args.data, args.size), {
    width,
    height,
    fonts: args.fontData
      ? [{ name: 'Geist', data: args.fontData, style: 'normal' as const, weight: 400 as const }]
      : undefined,
    headers: CACHE_HEADERS,
  })
}

/** Fetch the brand font from the site origin; never throws (returns null on blip). */
export async function loadGeistFromOrigin(origin: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(new URL('/fonts/Geist-Regular.ttf', origin))
    if (r.ok) return await r.arrayBuffer()
  } catch {
    /* fall back to default font */
  }
  return null
}

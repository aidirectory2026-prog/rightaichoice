import { NextRequest, NextResponse } from 'next/server'

/**
 * Reverse proxy so Mixpanel events route through our own domain:
 *   browser → https://rightaichoice.com/mp/track → api-eu.mixpanel.com/track
 *
 * Why: uBlock, Brave shields, and similar extensions block *.mixpanel.com
 * outright. Routing via /mp on our own domain recovers 20–40% of events.
 *
 * Enable in the browser by setting NEXT_PUBLIC_MIXPANEL_PROXY_PATH=/mp.
 * The MixpanelProvider reads that var and passes it as api_host.
 */

const UPSTREAM = process.env.MIXPANEL_DATA_API_HOST || 'https://api-eu.mixpanel.com'

export const runtime = 'edge'
// Proxied analytics must never be cached — each request contains unique payload.
export const dynamic = 'force-dynamic'

async function forward(req: NextRequest, params: { path: string[] }) {
  const subpath = params.path.join('/')
  const search = req.nextUrl.search
  const target = `${UPSTREAM}/${subpath}${search}`

  // Forward the real client IP so Mixpanel geo-resolution stays accurate.
  // Cloudflare / Vercel expose this via x-forwarded-for or x-real-ip.
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  if (clientIp) headers.set('x-forwarded-for', clientIp)
  // Propagate the user agent so Mixpanel device/browser parsing works.
  const ua = req.headers.get('user-agent')
  if (ua) headers.set('user-agent', ua)

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer()

  const upstreamRes = await fetch(target, {
    method: req.method,
    headers,
    body,
  })

  const responseHeaders = new Headers(upstreamRes.headers)
  // Strip cookies — Mixpanel doesn't set any meaningful ones, and leaking
  // upstream cookies back to the browser can confuse session state.
  responseHeaders.delete('set-cookie')

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forward(req, await ctx.params)
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return forward(req, await ctx.params)
}
export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return forward(req, await ctx.params)
}

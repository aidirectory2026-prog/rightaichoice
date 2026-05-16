import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'

// Weekly GSC sitemap re-submission cron.
//
// Vercel runs this every Monday at 06:00 UTC (see vercel.json). Pings
// Google Search Console "sitemaps.submit" to tell Google "the sitemap
// at /sitemap-index.xml has changed — re-check it." Doesn't force per-
// URL indexing (the Indexing API is restricted) but accelerates crawl
// scheduling for whatever's in the sitemap that Google hasn't seen.
//
// Local manual run (operator): `npm run gsc:sitemap:submit` — uses the
// file-based OAuth from .env.local. This cron uses env-only OAuth so
// it can run on Vercel without a filesystem.
//
// REQUIRED VERCEL ENV (already configured for the daily orchestrator):
//   GSC_OAUTH_CLIENT_ID         (from OAuth client JSON `installed.client_id`)
//   GSC_OAUTH_CLIENT_SECRET     (from `installed.client_secret`)
//   GSC_OAUTH_REFRESH_TOKEN     (from token JSON `refresh_token`)
//   GSC_SITE_URL                (default: sc-domain:rightaichoice.com)
//   CRON_SECRET                 (so only Vercel can trigger this route)

const SITE = process.env.GSC_SITE_URL || 'sc-domain:rightaichoice.com'
const SITEMAP_URL =
  process.env.GSC_SITEMAP_URL || 'https://rightaichoice.com/sitemap-index.xml'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  // Vercel cron auth — only this route's CRON_SECRET can fire it.
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GSC_OAUTH_CLIENT_ID
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      {
        error:
          'Missing GSC OAuth env. Set GSC_OAUTH_CLIENT_ID + GSC_OAUTH_CLIENT_SECRET + GSC_OAUTH_REFRESH_TOKEN.',
      },
      { status: 500 },
    )
  }

  try {
    const oauth = new OAuth2Client(clientId, clientSecret)
    oauth.setCredentials({ refresh_token: refreshToken })
    const { token } = await oauth.getAccessToken()
    if (!token) {
      return NextResponse.json({ error: 'failed to mint access token' }, { status: 500 })
    }

    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { ok: false, status: res.status, body: body.slice(0, 500) },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true, sitemap: SITEMAP_URL, site: SITE })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}

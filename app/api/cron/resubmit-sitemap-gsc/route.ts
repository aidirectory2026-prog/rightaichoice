import { OAuth2Client } from 'google-auth-library'
import { cronRoute } from '@/lib/pipelines/with-logging'

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

export const GET = cronRoute({ pipelineKey: 'resubmit-sitemap-gsc' }, async (ctx) => {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing GSC OAuth env. Set GSC_OAUTH_CLIENT_ID + GSC_OAUTH_CLIENT_SECRET + GSC_OAUTH_REFRESH_TOKEN.',
    )
  }

  const oauth = new OAuth2Client(clientId, clientSecret)
  oauth.setCredentials({ refresh_token: refreshToken })
  const { token } = await oauth.getAccessToken()
  if (!token) throw new Error('failed to mint access token')

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GSC submit HTTP ${res.status}: ${body.slice(0, 500)}`)
  }

  ctx.recordItems({ processed: 1, succeeded: 1 })
  ctx.recordMetadata({ sitemap: SITEMAP_URL, site: SITE })
  return { ok: true, sitemap: SITEMAP_URL, site: SITE }
})

/**
 * Phase 7B.seo (2026-05-13): Google Search Console sitemap re-submit.
 *
 * Hits the Search Console API's sitemaps.submit endpoint to tell
 * Google "this sitemap has changed, please re-crawl." Doesn't force
 * indexing of individual URLs (that's what the unsupported Indexing
 * API would do) but accelerates crawl scheduling for whatever's in
 * the sitemap that Google hasn't seen yet.
 *
 * USAGE:
 *   npm run gsc:sitemap:submit
 *
 * REQUIRED ENV (in .env.local — same OAuth file as Phase 7A):
 *   GSC_OAUTH_CLIENT_PATH    (downloaded OAuth client_secret JSON)
 *   GSC_OAUTH_TOKEN_PATH     (refresh_token from gsc:oauth:bootstrap)
 *   GSC_SITE_URL             (default: sc-domain:rightaichoice.com)
 *
 * IMPORTANT: this requires the WRITE scope (webmasters, not
 * webmasters.readonly). If the existing refresh token was issued under
 * .readonly, you'll get insufficient_scope; re-run gsc:oauth:bootstrap
 * to re-authorize with the broader scope (the bootstrap script was
 * updated 2026-05-13 to request the wider scope by default).
 */
export {}

import { OAuth2Client } from 'google-auth-library'
import { readFileSync } from 'fs'

const SITE = process.env.GSC_SITE_URL || 'sc-domain:rightaichoice.com'
// Phase 7I (2026-05-16): submit the index, not the legacy monolith.
// /sitemap-index.xml lists 8 per-type subsitemaps; GSC will fetch each.
const SITEMAP_URL =
  process.env.GSC_SITEMAP_URL || 'https://rightaichoice.com/sitemap-index.xml'

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

const clientPath = process.env.GSC_OAUTH_CLIENT_PATH
const tokenPath = process.env.GSC_OAUTH_TOKEN_PATH
if (!clientPath || !tokenPath) fail('GSC_OAUTH_CLIENT_PATH + GSC_OAUTH_TOKEN_PATH required')

const clientJson = JSON.parse(readFileSync(clientPath, 'utf-8'))
const creds = clientJson.installed || clientJson.web
if (!creds?.client_id) fail(`OAuth client JSON malformed: ${clientPath}`)
const tokenJson = JSON.parse(readFileSync(tokenPath, 'utf-8'))
if (!tokenJson.refresh_token) fail(`Token file missing refresh_token: ${tokenPath}`)

const oauth = new OAuth2Client(creds.client_id, creds.client_secret)
oauth.setCredentials({ refresh_token: tokenJson.refresh_token })

async function main() {
  console.log(`Site:    ${SITE}`)
  console.log(`Sitemap: ${SITEMAP_URL}`)
  console.log('')

  const { token } = await oauth.getAccessToken()
  if (!token) fail('Failed to refresh OAuth access token')

  // PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    SITE
  )}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 403 && body.includes('insufficient')) {
      fail(
        `403 insufficient_scope — your refresh_token was issued under the narrow .readonly scope.\n   Re-run \`npm run gsc:oauth:bootstrap\` to re-authorize with the broader webmasters scope.`
      )
    }
    fail(`Submit failed ${res.status}: ${body.slice(0, 400)}`)
  }

  console.log(`✓ Submitted sitemap to GSC (HTTP ${res.status})`)
  console.log('')
  console.log('Verify in Search Console → Sitemaps. Google typically begins')
  console.log('processing within a few minutes; full crawl rescheduling can')
  console.log('take 24-72h depending on site authority.')
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})

/**
 * Phase 7A — One-time OAuth bootstrap for GSC API access.
 *
 * Why we need this: Google's "Secure by Default" org policy
 * (iam.disableServiceAccountKeyCreation) blocks JSON service-account
 * keys on most new GCP organizations. OAuth 2.0 user credentials
 * sidestep that policy entirely.
 *
 * What this does:
 *   1. Reads your downloaded OAuth client_secret JSON from
 *      GSC_OAUTH_CLIENT_PATH
 *   2. Spins up a tiny local HTTP server on http://localhost:8765/callback
 *   3. Opens your browser to Google's auth URL
 *   4. You click "Allow" → browser redirects back to localhost
 *   5. Server captures the auth code, exchanges it for a refresh_token
 *   6. Saves {refresh_token: "..."} to GSC_OAUTH_TOKEN_PATH
 *
 * After this runs once, the mining script (`npm run mine:gsc:apply`)
 * uses that refresh_token to get fresh access tokens automatically.
 *
 * USAGE:
 *   npm run gsc:oauth:bootstrap
 *
 * REQUIRED ENV:
 *   GSC_OAUTH_CLIENT_PATH    — absolute path to client_secret_*.json
 *   GSC_OAUTH_TOKEN_PATH     — absolute path where refresh token gets saved
 *
 * See docs/marketing/10-gsc-keyword-mining.md for the GCP-side setup.
 */
export {}

import http from 'http'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { OAuth2Client } from 'google-auth-library'

const PORT = 8765
const REDIRECT_URI = `http://localhost:${PORT}/callback`
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

const clientPath = process.env.GSC_OAUTH_CLIENT_PATH
const tokenPath = process.env.GSC_OAUTH_TOKEN_PATH
if (!clientPath) fail('GSC_OAUTH_CLIENT_PATH not set in .env.local')
if (!tokenPath) fail('GSC_OAUTH_TOKEN_PATH not set in .env.local')

const clientJson = JSON.parse(readFileSync(clientPath, 'utf-8'))
const creds = clientJson.installed || clientJson.web
if (!creds || !creds.client_id || !creds.client_secret) {
  fail(
    `OAuth client JSON at ${clientPath} is missing client_id/client_secret. Did you download the right file from GCP Console → Credentials?`
  )
}

const oauth = new OAuth2Client(creds.client_id, creds.client_secret, REDIRECT_URI)
const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // force re-issuance of refresh_token even if already granted
})

console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  GSC OAuth Bootstrap')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')
console.log('Opening browser to authorize Search Console access...')
console.log('')
console.log('If the browser does not open, paste this URL manually:')
console.log('')
console.log(`  ${authUrl}`)
console.log('')
console.log('Waiting for you to click "Allow"...')
console.log('')

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', REDIRECT_URI)
    if (!url.pathname.startsWith('/callback')) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    if (error) {
      res.statusCode = 400
      res.end(`Auth error: ${error}. Close this tab and re-run the bootstrap.`)
      console.error(`\n❌ Browser returned error: ${error}\n`)
      server.close()
      process.exit(1)
    }
    if (!code) {
      res.statusCode = 400
      res.end('Missing code parameter. Close this tab and re-run the bootstrap.')
      return
    }

    const { tokens } = await oauth.getToken(code)
    if (!tokens.refresh_token) {
      res.statusCode = 500
      res.end(
        'No refresh_token in Google response. Revoke access at https://myaccount.google.com/permissions and re-run bootstrap.'
      )
      console.error(
        '\n❌ Google returned an access_token but no refresh_token. ' +
          'This usually means you previously authorized this OAuth client ' +
          'and Google is reusing the prior grant. Fix: revoke at ' +
          'https://myaccount.google.com/permissions, then re-run.\n'
      )
      server.close()
      process.exit(1)
    }

    mkdirSync(dirname(tokenPath!), { recursive: true })
    writeFileSync(tokenPath!, JSON.stringify({ refresh_token: tokens.refresh_token }, null, 2), {
      mode: 0o600,
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(
      `<html><body style="font-family:system-ui;padding:40px;max-width:500px;margin:60px auto;text-align:center"><h1 style="color:#10b981">✓ Authorized</h1><p style="color:#6b7280">Refresh token saved to <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${tokenPath}</code></p><p style="color:#6b7280">You can close this tab and return to your terminal.</p></body></html>`
    )
    console.log(`✓ Saved refresh_token to ${tokenPath}`)
    console.log('')
    console.log('Next: `npm run mine:gsc:apply -- --slug=kit` to smoke-test on one tool.')
    console.log('')
    server.close()
    setTimeout(() => process.exit(0), 200)
  } catch (err) {
    res.statusCode = 500
    const msg = err instanceof Error ? err.message : String(err)
    res.end(`Token exchange failed: ${msg}`)
    console.error('\n❌ Token exchange failed:', msg, '\n')
    server.close()
    process.exit(1)
  }
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    fail(
      `Port ${PORT} is already in use. Either stop whatever's using it or edit PORT in scripts/oauth-gsc-bootstrap.ts.`
    )
  }
  fail(`Server error: ${err.message}`)
})

// openBrowser: spawn the platform-native opener with the URL as an
// explicit argv element — no shell interpolation, no injection surface.
function openBrowser(url: string) {
  let cmd: string
  let args: string[]
  if (process.platform === 'darwin') {
    cmd = 'open'
    args = [url]
  } else if (process.platform === 'win32') {
    // `start` on Windows needs an empty title arg before the URL.
    cmd = 'cmd'
    args = ['/c', 'start', '', url]
  } else {
    cmd = 'xdg-open'
    args = [url]
  }
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
    child.on('error', () => {
      console.log('(Could not auto-open browser. Use the URL above manually.)')
    })
    child.unref()
  } catch {
    console.log('(Could not auto-open browser. Use the URL above manually.)')
  }
}

server.listen(PORT, () => {
  openBrowser(authUrl)
})

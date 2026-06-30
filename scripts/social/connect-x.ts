/**
 * Phase 13 Social — one-time X (Twitter) account connector.
 *
 * Runs the OAuth2 Authorization-Code + PKCE flow locally: prints an authorize URL,
 * catches the redirect on http://localhost:4000/callback, exchanges the code for a
 * user access + refresh token, looks up the account, and upserts the social_accounts
 * row (status='connected'). After this, the cloud publish cron can post approved X
 * posts. Run ONCE (re-run only to reconnect). The daily token-refresh cron keeps it alive.
 *
 * PREREQ (in .env.local for this local run): X_CLIENT_ID, X_CLIENT_SECRET
 *   (same values you put in Vercel) + the usual SUPABASE_* keys.
 * The X app's callback URL must be exactly: http://localhost:4000/callback
 *
 * Run: npm run social:connect-x
 */
export {}

import crypto from 'node:crypto'
import http from 'node:http'
import { exec } from 'node:child_process'
import { getAdminClient } from '../../lib/cron/supabase-admin'

const PORT = 4000
const REDIRECT_URI = `http://localhost:${PORT}/callback`
const SCOPES = 'tweet.read tweet.write users.read offline.access media.write'
const AUTHORIZE = 'https://twitter.com/i/oauth2/authorize'
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function main() {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('✗ Missing X_CLIENT_ID / X_CLIENT_SECRET in .env.local (add the same values you put in Vercel).')
    process.exit(1)
  }

  const verifier = b64url(crypto.randomBytes(32))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  const state = b64url(crypto.randomBytes(16))

  const authUrl =
    `${AUTHORIZE}?response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`

  console.log('\n=== Connect X / Twitter ===')
  console.log('1) A browser tab will open (or paste this URL):\n')
  console.log(authUrl)
  console.log('\n2) Make sure you are logged into the RightAIChoice X account, then click "Authorize app".')
  console.log('3) You will be redirected back here automatically. Waiting…\n')
  exec(`open "${authUrl}"`, () => {}) // best-effort auto-open (macOS)

  const code: string = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404).end()
        return
      }
      const url = new URL(req.url, REDIRECT_URI)
      const returnedState = url.searchParams.get('state')
      const c = url.searchParams.get('code')
      const err = url.searchParams.get('error')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      if (err || !c || returnedState !== state) {
        res.end('<h2>Connection failed.</h2><p>You can close this tab and re-run the command.</p>')
        server.close()
        reject(new Error(err ?? (returnedState !== state ? 'state mismatch' : 'no code')))
        return
      }
      res.end('<h2>✓ X connected.</h2><p>You can close this tab and return to the terminal.</p>')
      server.close()
      resolve(c)
    })
    server.listen(PORT)
    setTimeout(() => {
      server.close()
      reject(new Error('timed out waiting for authorization (5 min)'))
    }, 300_000)
  })

  console.log('Exchanging code for tokens…')
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const tokRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier }).toString(),
  })
  if (!tokRes.ok) {
    console.error(`✗ Token exchange failed: ${tokRes.status} ${(await tokRes.text()).slice(0, 300)}`)
    process.exit(1)
  }
  const tok = (await tokRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number }

  // Identify the account (for external_account_id + a friendly name).
  let username = ''
  let userId = ''
  try {
    const me = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${tok.access_token}` } })
    if (me.ok) {
      const d = (await me.json()) as { data?: { id: string; username: string } }
      username = d.data?.username ?? ''
      userId = d.data?.id ?? ''
    }
  } catch {
    /* non-fatal */
  }

  const db = getAdminClient()
  const cur = (await db.from('social_accounts').select('meta').eq('platform', 'x').maybeSingle()) as {
    data: { meta: Record<string, unknown> | null } | null
  }
  const meta = { ...((cur.data?.meta as Record<string, unknown>) ?? {}) }
  const row = {
    platform: 'x',
    display_name: username ? `@${username}` : 'X account',
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    token_expires_at: new Date(Date.now() + (tok.expires_in ?? 7200) * 1000).toISOString(),
    scope: SCOPES,
    external_account_id: userId || null,
    status: 'connected',
    meta,
    updated_at: new Date().toISOString(),
  }
  const up = (await db.from('social_accounts').upsert(row as never, { onConflict: 'platform' })) as { error: { message: string } | null }
  if (up.error) {
    console.error(`✗ Failed to save the account: ${up.error.message}`)
    process.exit(1)
  }

  console.log(`\n✓ Connected X as ${username ? '@' + username : 'your account'}.`)
  console.log('  The publish cron can now post APPROVED X posts. Approve one in /admin/social to go live.')
  process.exit(0)
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})

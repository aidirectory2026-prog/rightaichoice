/**
 * Phase 10.5b (2026-06-12) — authenticated admin smoke check.
 *
 * Born from the P0 incident (build log 5.4): /admin 500'd for logged-in
 * admins while every unauthenticated check passed, because the auth redirect
 * fires before page code runs. Unauthed route checks are INSUFFICIENT
 * evidence — this script is the fix, required by every gate from 5b on.
 *
 * What it does:
 *   1. Creates a disposable admin user (server-side, service role) and mints
 *      a magic-link session against the target deployment.
 *   2. Fetches every admin route from lib/admin/nav.ts (plus param'd extras)
 *      WITH the authenticated cookies.
 *   3. PASS = every route renders (2xx). Any 5xx → exit 1 with the list.
 *   4. Deletes the disposable user + any rows it created. Always (finally).
 *
 * USAGE:
 *   npx tsx --env-file=.env.local scripts/audit/authed-smoke.ts                      # against http://localhost:3000
 *   npx tsx --env-file=.env.local scripts/audit/authed-smoke.ts --base-url=https://rightaichoice.com
 *   --extra-route=/admin/insights/user/<id>?tab=journey   # repeatable; gate-specific
 *                                                         # param'd URLs (10.6 adds
 *                                                         # real-id journey checks)
 */
export {}

import { createClient } from '@supabase/supabase-js'
import { ADMIN_NAV } from '../../lib/admin/nav'

const BASE = process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1] ?? 'http://localhost:3000'
const EMAIL = `phase10-smoke-${Date.now()}@rightaichoice.com`

// 10.6 — repeatable --extra-route= for gate-specific param'd URLs (slice,
// not split: routes carry their own query-string '='s).
const EXTRA_ARG_ROUTES = process.argv
  .filter((a) => a.startsWith('--extra-route='))
  .map((a) => a.slice('--extra-route='.length))
  .filter(Boolean)

const EXTRA_ROUTES = [
  '/admin/insights/events?event=page_viewed',
  '/admin/insights/events?event=page_viewed&prop=path',
  '/admin/insights/users?sort=events',
  '/admin/insights?device=desktop&bots=0',
  // 10.5c.4 — journey/health merges: the user 360 Journey tab must render
  // (unknown ids render the empty state, never 500), and the old routes must
  // redirect (3xx counts as ok below as long as it isn't a /login bounce).
  '/admin/insights/user/phase10-smoke-unknown-visitor?tab=journey',
  '/admin/insights/journey/phase10-smoke-unknown-visitor',
  '/admin/insights/journey',
  '/admin/insights/health',
]

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin env not set (run with --env-file=.env.local)')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function main() {
  const db = adminDb()
  let userId: string | null = null
  const failures: string[] = []

  try {
    // 1. disposable admin + magic-link token
    const { data: created, error: cErr } = await db.auth.admin.createUser({ email: EMAIL, email_confirm: true })
    if (cErr || !created.user) throw new Error(`createUser: ${cErr?.message}`)
    userId = created.user.id
    const { error: pErr } = await db
      .from('profiles')
      .upsert({ id: userId, is_admin: true, username: `smoke-${Date.now()}` }, { onConflict: 'id' })
    if (pErr) throw new Error(`profiles upsert: ${pErr.message}`)
    const { data: link, error: lErr } = await db.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
    if (lErr || !link) throw new Error(`generateLink: ${lErr?.message}`)

    // 2. exchange via the app's confirm route, keep cookies
    const confirmRes = await fetch(
      `${BASE}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/admin`,
      { redirect: 'manual' },
    )
    const cookies = confirmRes.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    if (!cookies) throw new Error(`no session cookies from /auth/confirm (status ${confirmRes.status})`)

    // 3. authed fetch of every admin route
    const routes = [
      ...ADMIN_NAV.flatMap((s) => s.items.map((i) => i.href)),
      ...EXTRA_ROUTES,
      ...EXTRA_ARG_ROUTES,
    ]
    for (const route of routes) {
      const res = await fetch(`${BASE}${route}`, { headers: { cookie: cookies }, redirect: 'manual' })
      const ok = res.status >= 200 && res.status < 400
      const redirectedToLogin = res.status >= 300 && (res.headers.get('location') ?? '').includes('/login')
      if (!ok || redirectedToLogin) {
        failures.push(`${res.status} ${route}${redirectedToLogin ? ' (bounced to login — session not honored)' : ''}`)
        console.log(`✗ ${res.status}  ${route}`)
      } else {
        console.log(`✓ ${res.status}  ${route}`)
      }
    }
  } finally {
    // 4. cleanup — always
    if (userId) {
      await db.from('user_events').delete().eq('user_id', userId)
      await db.from('profiles').delete().eq('id', userId)
      await db.auth.admin.deleteUser(userId).catch(() => {})
    }
  }

  if (failures.length > 0) {
    console.error(`\nAUTHED SMOKE FAILED (${failures.length}):\n` + failures.join('\n'))
    process.exit(1)
  }
  console.log(`\n✓ authed smoke passed — every admin route renders for a logged-in admin (${BASE})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

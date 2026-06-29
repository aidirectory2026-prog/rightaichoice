/**
 * Phase 13 Social — end-to-end check of the social-publish cron against the live DB.
 * Approves a draft (past schedule), runs the cron handler with the real CRON_SECRET,
 * asserts it SAFELY SKIPS (no platform connected → stays 'approved', never posts),
 * then reverts the row. No external post is ever made.
 *
 * Run: npm run social:verify-publish-cron -- <draft-uuid>
 */
export {}

import { getAdminClient } from '../../lib/cron/supabase-admin'
import { GET } from '../../app/api/cron/social-publish/route'

const id = process.argv.slice(2).find((a) => !a.startsWith('-'))

async function main() {
  if (!id) throw new Error('pass a social_posts draft uuid')
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET not in env')
  const db = getAdminClient()

  // snapshot original
  const orig = (await db.from('social_posts').select('status, scheduled_at, error').eq('id', id).single()) as {
    data: { status: string; scheduled_at: string | null; error: string | null } | null
  }
  if (!orig.data) throw new Error('post not found')
  console.log(`original: status=${orig.data.status}`)

  // approve with a past schedule so the cron picks it up
  const past = new Date(Date.now() - 3_600_000).toISOString()
  await db.from('social_posts').update({ status: 'approved', scheduled_at: past, error: null } as never).eq('id', id)
  console.log('→ set approved + past schedule')

  // run the cron with valid auth
  const res = await GET(new Request('http://localhost/api/cron/social-publish', { headers: { authorization: `Bearer ${secret}` } }))
  const body = await res.json()
  console.log(`cron HTTP ${res.status}:`, JSON.stringify(body))

  // assert: skipped (not posted/failed) because no platform is connected
  const after = (await db.from('social_posts').select('status, error').eq('id', id).single()) as {
    data: { status: string; error: string | null } | null
  }
  const ok = after.data?.status === 'approved' && (body.skipped ?? 0) >= 1 && (body.posted ?? 0) === 0
  console.log(`after: status=${after.data?.status}  note="${after.data?.error}"`)
  console.log(ok ? '\n✓ cron ran; post safely SKIPPED (not connected) — left approved, nothing posted' : '\n✗ unexpected outcome')

  // revert to original
  await db
    .from('social_posts')
    .update({ status: orig.data.status, scheduled_at: orig.data.scheduled_at, error: orig.data.error } as never)
    .eq('id', id)
  console.log(`reverted to status=${orig.data.status}`)
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

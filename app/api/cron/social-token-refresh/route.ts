// Phase 13 Social — HOURLY token refresh. Refreshes platform OAuth tokens before
// they expire (X / LinkedIn / Reddit refresh_token grant; Instagram long-lived
// refresh). Runs hourly because X (and Reddit) access tokens live only ~2h — a
// daily refresh left them dead most of the day; selectExpiring(72h) means X/Reddit
// refresh every run while long-lived LinkedIn/IG tokens only refresh near expiry.
// Tokens that can't be refreshed near expiry are marked status='error' so the
// admin connection strip shows they need reconnecting.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { refreshAccessToken, selectExpiring } from '@/lib/social/publishers/refresh'
import type { SocialAccount } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = cronRoute({ pipelineKey: 'social-token-refresh' }, async (ctx) => {
  const db = getAdminClient()
  const res = await db.from('social_accounts').select('*')
  const accounts = (res.data ?? []) as SocialAccount[]
  const expiring = selectExpiring(accounts, 72)

  let refreshed = 0
  let errored = 0
  for (const acc of expiring) {
    const r = await refreshAccessToken(acc).catch(() => null)
    if (r) {
      await db
        .from('social_accounts')
        .update({
          access_token: r.access_token,
          refresh_token: r.refresh_token ?? acc.refresh_token,
          token_expires_at: r.token_expires_at,
          status: 'connected',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', acc.id)
      refreshed++
    } else {
      // Refresh failed. Only flag 'error' if the token will expire BEFORE the next
      // daily run can retry (<25h) — otherwise a transient refresh outage shouldn't
      // prematurely disable an account that still has days of validity. This is the
      // robustness fix: don't wait for full expiry to surface a dead refresh path,
      // but don't cry wolf 3 days early either.
      const msLeft = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() - Date.now() : Infinity
      if (msLeft < 25 * 3_600_000) {
        await db.from('social_accounts').update({ status: 'error', updated_at: new Date().toISOString() } as never).eq('id', acc.id)
        errored++
      }
    }
  }

  ctx.recordItems({ processed: expiring.length, succeeded: refreshed, failed: errored })
  ctx.recordMetadata({ expiring: expiring.length, refreshed, errored })
  if (errored > 0) ctx.setStatus('partial')
  return { expiring: expiring.length, refreshed, errored }
})

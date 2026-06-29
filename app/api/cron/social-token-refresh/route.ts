// Phase 13 Social — daily token refresh. Refreshes platform OAuth tokens before
// they expire (X / LinkedIn / Reddit refresh_token grant; Instagram long-lived
// refresh). Tokens that can't be refreshed (no creds / refresh failed) and are
// already expired are marked status='error' so the admin connection strip shows
// they need reconnecting.

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
      const expired = acc.token_expires_at != null && new Date(acc.token_expires_at).getTime() <= Date.now()
      if (expired) {
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

// Phase 13 Social — OAuth token refresh (keeps platform logins alive).
//
// X / LinkedIn / Reddit use the standard OAuth2 refresh_token grant; Instagram
// uses a long-lived-token refresh GET. Each only runs when that platform's client
// credentials are present in env — otherwise it's skipped (no creds yet).

import type { Platform, SocialAccount } from '../types'

/** Pure: which connected accounts have a token expiring within `withinHours`. */
export function selectExpiring(accounts: SocialAccount[], withinHours = 72, nowMs = Date.now()): SocialAccount[] {
  const horizon = nowMs + withinHours * 3_600_000
  return accounts.filter(
    (a) => a.status === 'connected' && a.token_expires_at != null && new Date(a.token_expires_at).getTime() <= horizon,
  )
}

export type RefreshResult = { access_token: string; refresh_token?: string; token_expires_at: string } | null

async function oauth2Refresh(
  url: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  extra: Record<string, string> = {},
): Promise<RefreshResult> {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, ...extra })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  })
  if (!res.ok) return null
  const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!j.access_token) return null
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    token_expires_at: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
  }
}

/** Attempt a refresh for one account. Returns null if not possible (no creds / no refresh token). */
export async function refreshAccessToken(account: SocialAccount): Promise<RefreshResult> {
  const p: Platform = account.platform
  if (p === 'instagram') {
    // IG: long-lived token refresh (no client secret; refreshes the access token itself).
    if (!account.access_token) return null
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.access_token}`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!j.access_token) return null
    return { access_token: j.access_token, token_expires_at: new Date(Date.now() + (j.expires_in ?? 5_184_000) * 1000).toISOString() }
  }

  if (!account.refresh_token) return null
  const id = process.env[`${p === 'x' ? 'X' : p.toUpperCase()}_CLIENT_ID`]
  const secret = process.env[`${p === 'x' ? 'X' : p.toUpperCase()}_CLIENT_SECRET`]
  if (!id || !secret) return null

  const endpoint: Record<Exclude<Platform, 'instagram'>, string> = {
    x: 'https://api.twitter.com/2/oauth2/token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
    reddit: 'https://www.reddit.com/api/v1/access_token',
  }
  return oauth2Refresh(endpoint[p], account.refresh_token, id, secret)
}

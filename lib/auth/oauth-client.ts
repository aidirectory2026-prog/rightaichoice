'use client'

import { createClient } from '@/lib/supabase/client'

// Phase 9 S2 (2026-06-01): client-side OAuth initiation.
//
// The old flow called the `signInWithGoogle` SERVER ACTION, which ran
// `signInWithOAuth` server-side and `redirect()`-ed to the provider. With
// Supabase's PKCE flow that persists the one-time `code_verifier` via a
// server Set-Cookie that races the redirect — so intermittently the verifier
// cookie wasn't present on the `/auth/callback` request and
// `exchangeCodeForSession` failed ("Google sign-in fails a few times before it
// works", because a later attempt's fresh cookie finally lands).
//
// Initiating from the BROWSER client writes the verifier cookie directly in
// the browser BEFORE navigating to the provider, so it is always present on the
// callback. This is Supabase's recommended pattern for SSR OAuth. We also use
// `window.location.origin` for the callback so the redirect target always
// matches the current host (localhost / preview / prod) — removing the
// NEXT_PUBLIC_APP_URL-mismatch failure mode.

export type OAuthProvider = 'google' | 'linkedin_oidc'

/** Same-origin path guard (client equivalent of safeNext) — blocks open-redirect. */
function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

/**
 * Begin an OAuth sign-in from the browser. On success the Supabase browser
 * client redirects to the provider automatically; on failure we bounce to
 * /login with an error hint.
 */
export async function signInWithOAuthClient(provider: OAuthProvider, next?: string | null): Promise<void> {
  const supabase = createClient()
  const callback = new URL('/auth/callback', window.location.origin)
  callback.searchParams.set('next', safeNextPath(next))

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
      // Google: request offline access so a refresh token is issued, but do NOT
      // force `prompt=consent` on every login — returning users shouldn't have
      // to re-grant each time.
      ...(provider === 'google' ? { queryParams: { access_type: 'offline' } } : {}),
    },
  })

  if (error) {
    console.error(`OAuth (${provider}) init failed:`, error.message)
    window.location.href = '/login?error=oauth_failed'
  }
}

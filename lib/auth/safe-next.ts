/**
 * Phase 7 Step 57 (BUG-020): single open-redirect guard shared by every
 * place that consumes a `?next=` parameter — server actions, OAuth/email
 * callback routes, magic-link confirms.
 *
 * Why this exists: an attacker who can deliver a crafted link
 *   https://rightaichoice.com/auth/callback?code=...&next=//evil.com
 * gets the victim to authenticate against the real domain, then has the
 * server bounce them off-site to the attacker's domain with fresh session
 * cookies still in the browser. Textbook open-redirect → phishing.
 *
 * The guard accepts only same-origin relative paths (`/foo`, `/bar?x=y`).
 * It rejects:
 *   - protocol-relative URLs:   //evil.com           → fallback
 *   - absolute URLs:            https://evil.com     → fallback
 *   - non-string types:         null, undefined, File → fallback
 *   - script schemes:           javascript:alert(1)  → fallback (no leading /)
 *
 * The fallback defaults to /dashboard but callers can override (the magic-
 * link reset flow uses /update-password, for example).
 */
export function safeNext(
  raw: FormDataEntryValue | string | null | undefined,
  fallback = '/dashboard',
): string {
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}

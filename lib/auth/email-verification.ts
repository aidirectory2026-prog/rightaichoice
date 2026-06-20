// Phase 11 (2026-06-21): our own email-verification layer.
//
// With Supabase "Confirm email" OFF, signup is instant (a session is returned
// immediately) but Supabase auto-marks the email confirmed, so it can't model
// "logged in but not yet verified". We track that ourselves on
// profiles.email_verified and drive verification through a hashed one-time token
// emailed via Resend (the same transport the alert crons use).

import { createHash, randomBytes } from 'crypto'
import { getAdminClient } from '@/lib/cron/supabase-admin'

const FROM_EMAIL = process.env.AUTH_FROM_EMAIL ?? 'RightAIChoice <noreply@rightaichoice.com>'
const TOKEN_TTL_HOURS = 24

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

/** Mint a one-time verification token for a user, store only its hash, return the raw token. */
export async function createVerificationToken(userId: string, email: string): Promise<string> {
  const admin = getAdminClient()
  const raw = randomBytes(32).toString('hex')
  const nowIso = new Date().toISOString()
  // Invalidate any still-pending tokens for this user so only the newest link works.
  await admin
    .from('email_verification_tokens')
    .update({ used_at: nowIso } as never)
    .eq('user_id', userId)
    .is('used_at', null)
  await admin.from('email_verification_tokens').insert({
    user_id: userId,
    token_hash: sha256(raw),
    email,
    expires_at: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString(),
  } as never)
  return raw
}

/** Send the verification email via Resend. Best-effort; returns ok/error. */
export async function sendVerificationEmail(
  email: string,
  rawToken: string,
  origin: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  const link = `${origin.replace(/\/$/, '')}/auth/verify-email?token=${rawToken}`
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:18px;color:#111">Confirm your email</h1>
      <p style="font-size:14px;color:#444;line-height:1.6">Thanks for joining RightAIChoice. Confirm this is your email so we can keep your account secure and send you the things you ask for — nothing else.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px">Verify my email</a>
      </p>
      <p style="font-size:12px;color:#888;line-height:1.6">Or paste this link into your browser:<br><span style="color:#059669">${link}</span></p>
      <p style="font-size:12px;color:#aaa;margin-top:24px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: 'Verify your email — RightAIChoice', html }),
    })
    if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}

/** Mint + send in one step. Never throws — returns ok/error. */
export async function issueAndSendVerification(
  userId: string,
  email: string,
  origin: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const raw = await createVerificationToken(userId, email)
    return await sendVerificationEmail(email, raw, origin)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'issue failed' }
  }
}

/** Consume a token: mark used + flip profiles.email_verified. Returns ok + userId. */
export async function verifyToken(rawToken: string): Promise<{ ok: boolean; userId?: string }> {
  const admin = getAdminClient()
  const { data } = await admin
    .from('email_verification_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', sha256(rawToken))
    .maybeSingle()
  const row = data as { id: string; user_id: string; expires_at: string; used_at: string | null } | null
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return { ok: false }
  await admin.from('email_verification_tokens').update({ used_at: new Date().toISOString() } as never).eq('id', row.id)
  await admin.from('profiles').update({ email_verified: true } as never).eq('id', row.user_id)
  return { ok: true, userId: row.user_id }
}

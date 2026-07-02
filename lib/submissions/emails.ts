// Phase 14 (2026-07-02) — transactional emails for the vendor tool-submission
// funnel. Same Resend raw-fetch transport as lib/auth/email-verification.ts:
// best-effort, never throws, returns { ok, error }. A failed email must never
// fail the submission or the admin review action.

const FROM_EMAIL = process.env.AUTH_FROM_EMAIL ?? 'RightAIChoice <noreply@rightaichoice.com>'

const REJECTION_REASON_COPY: Record<string, string> = {
  not_ai_tool:
    "It isn't an AI tool within our coverage scope. We only evaluate tools whose core value comes from AI capabilities.",
  duplicate: 'This tool is already in our catalog or our review pipeline.',
  low_quality:
    "We couldn't verify enough substance (working product, real pricing, clear use case) to evaluate it fairly.",
  site_unreachable: "The website URL couldn't be reached during review.",
  spam: 'The submission did not appear to be a genuine tool submission.',
  other: 'It did not pass editorial review.',
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}

function shell(body: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      ${body}
      <p style="font-size:12px;color:#aaa;margin-top:24px">RightAIChoice — the AI tool decision engine. Submissions are free and never influence rankings, scores, or recommendations.</p>
    </div>`
}

/** To the vendor, right after they submit. */
export function sendSubmissionReceivedEmail(to: string, toolName: string) {
  return sendEmail(
    to,
    `We received your submission — ${toolName}`,
    shell(`
      <h1 style="font-size:18px;color:#111">Submission received</h1>
      <p style="font-size:14px;color:#444;line-height:1.6"><strong>${escapeHtml(toolName)}</strong> is now in our editorial review queue. Every tool is independently reviewed by a human before it can enter the catalog — submitting never buys placement or affects how we score or recommend tools.</p>
      <p style="font-size:14px;color:#444;line-height:1.6">We'll email you the decision either way.</p>`),
  )
}

/** To the vendor when an admin approves. Approved ≠ published — say so. */
export function sendSubmissionApprovedEmail(to: string, toolName: string) {
  return sendEmail(
    to,
    `Approved for review pipeline — ${toolName}`,
    shell(`
      <h1 style="font-size:18px;color:#111">Your submission was approved</h1>
      <p style="font-size:14px;color:#444;line-height:1.6"><strong>${escapeHtml(toolName)}</strong> passed editorial review and has entered our enrichment and quality-check pipeline. Tools typically go live within about 24 hours, but only after every automated quality gate passes — approval is not a publication guarantee.</p>
      <p style="font-size:14px;color:#444;line-height:1.6">Because RightAIChoice is a decision engine, where your tool appears in results is determined entirely by our independent data — never by who submitted it.</p>`),
  )
}

/** To the vendor when an admin rejects, with a human-readable reason. */
export function sendSubmissionRejectedEmail(
  to: string,
  toolName: string,
  reason: string,
  note?: string | null,
) {
  const reasonCopy = REJECTION_REASON_COPY[reason] ?? REJECTION_REASON_COPY.other
  return sendEmail(
    to,
    `Submission decision — ${toolName}`,
    shell(`
      <h1 style="font-size:18px;color:#111">We couldn't accept this submission</h1>
      <p style="font-size:14px;color:#444;line-height:1.6"><strong>${escapeHtml(toolName)}</strong> didn't pass editorial review. Reason: ${escapeHtml(reasonCopy)}</p>
      ${note ? `<p style="font-size:14px;color:#444;line-height:1.6">Reviewer note: ${escapeHtml(note)}</p>` : ''}
      <p style="font-size:14px;color:#444;line-height:1.6">If the situation changes (e.g. the product evolves or the site issue is fixed), you're welcome to submit again.</p>`),
  )
}

/** To the operator when a new submission lands. */
export function sendAdminNewSubmissionEmail(sub: {
  name: string
  website_url: string
  tagline: string
  submitter_email: string
  submitter_role: string
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL
  if (!to) {
    console.warn('[submissions] ADMIN_NOTIFY_EMAIL not set — skipping admin notification')
    return Promise.resolve({ ok: false, error: 'ADMIN_NOTIFY_EMAIL not set' })
  }
  return sendEmail(
    to,
    `New tool submission: ${sub.name}`,
    shell(`
      <h1 style="font-size:18px;color:#111">New tool submission</h1>
      <p style="font-size:14px;color:#444;line-height:1.6">
        <strong>${escapeHtml(sub.name)}</strong> — ${escapeHtml(sub.tagline)}<br>
        ${escapeHtml(sub.website_url)}<br>
        From: ${escapeHtml(sub.submitter_email)} (${escapeHtml(sub.submitter_role)})
      </p>
      <p style="margin:24px 0">
        <a href="https://rightaichoice.com/admin/submissions" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px">Review in admin</a>
      </p>`),
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

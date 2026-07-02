# Vendor submissions queue — `/admin/submissions` (Phase 14)

Free vendor tool-submission funnel. The public form at `/submit` writes to the
`tool_submissions` table — **never directly to `tools`** — and this queue is
where a human decides what enters the catalog pipeline.

## The flow

```
/submit (sign-in required, full account)
  → tool_submissions row (status=pending)
  → operator email (ADMIN_NOTIFY_EMAIL) + /admin/submissions queue
  → Approve  → tools DRAFT row (is_published=false, submitted_by=<vendor uuid>)
               → onboard SOP (every 30 min) enriches + hard-gates → publishes
  → Reject   → status=rejected + reason → submitter emailed
```

- **Human approval replaces the traction gate.** Auto-ingested tools must show
  HN/GitHub/PH traction; vendor submissions bypass that (`curateCandidate` is
  not run) because an editor looked at them instead.
- **Approved ≠ published.** The onboard SOP hard gates (description, features,
  categories, ≥3 alternatives, ≥2 compares, ≥9 FAQs, editorial fields) remain
  the only publish path. All copy and emails say "approved — in quality
  checks, typically live within ~24h", never "published". If the SOP exhausts
  its 6 attempts the draft shows in `/admin/onboarding` (draft-stuck).
- **Integrity constraint (published on /submit and in every email):**
  submission is free and never influences rankings, scores, or
  recommendations. Never build anything on this queue that violates that.

## What the queue shows per card

All vendor-supplied fields, the submitter's email + self-declared relationship
(founder / employee / agency / user / other), and **dedupe hints**: catalog
tools (drafts included) matching the submission's exact normalized domain or
its name/slug. Domain matches were already hard-blocked at submit time, so a
hint here usually means a name collision — approval auto-suffixes the slug
(`-2`, `-3`, …).

## Rejection reasons (allowlist)

`not_ai_tool` · `duplicate` · `low_quality` · `site_unreachable` · `spam` ·
`other` — plus an optional free-text note (≤1000 chars). The submitter's email
renders these as human-readable sentences (`lib/submissions/emails.ts`).

## Anti-spam / abuse

Sign-in with a **full** (non-anonymous) account required — enforced by RLS
(`is_anonymous` JWT claim) and re-checked in the server action. Hidden
honeypot field (silently "accepted", nothing stored). Max 3 pending
submissions per user. Duplicate domain vs the whole catalog (drafts included)
and vs pending submissions blocked at submit time.

## Data / env

- Table: `tool_submissions` (migration `183_tool_submissions.sql`; RLS:
  submitter INSERT/SELECT own, admin ALL, no vendor UPDATE/DELETE).
- Env: `ADMIN_NOTIFY_EMAIL` — operator alert for new submissions (best-effort;
  warns and skips if unset). Resend transport (`RESEND_API_KEY`,
  `AUTH_FROM_EMAIL`) shared with auth emails.
- Events: `submit_cta_clicked`, `tool_submission_started`,
  `tool_submission_completed` (server-authoritative),
  `tool_submission_failed`, `tool_submission_reviewed` (distinct_id = the
  submitter). See `/admin/resources/event-dictionary`.

## Related docs

- `docs/automated-pipelines/README.md` — "Vendor submissions — the second
  entry path into the draft pipeline".
- `/admin/resources/data-pipelines` — plain-English "two doors, one quality
  bar" section.

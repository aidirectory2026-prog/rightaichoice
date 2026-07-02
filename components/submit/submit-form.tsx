'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { submitTool } from '@/actions/submissions'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import { analytics } from '@/lib/analytics'

// Phase 14 — vendor tool-submission form. Mirrors the question-form shape
// (useActionState + server action). Sign-in with a FULL account is required:
// guests (anonymous sessions) can't receive the decision email and are
// blocked by RLS anyway — they get an upgrade CTA instead of the form.

const inputCls =
  'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

export function SubmitForm() {
  const { user } = useAuth()
  const signupHref = useAuthHref('/signup')
  const loginHref = useAuthHref('/login')
  const [state, action, isPending] = useActionState(submitTool, null)
  const startedRef = useRef(false)

  // Journey tracking: started fires once on first field focus; failed fires
  // on each server-side error the user sees.
  useEffect(() => {
    if (state?.error) analytics.toolSubmissionFailed('validation')
  }, [state])

  const handleFirstFocus = () => {
    if (startedRef.current) return
    startedRef.current = true
    analytics.toolSubmissionStarted(!!user && !user.is_anonymous)
  }

  if (!user || user.is_anonymous) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center space-y-2">
        <p className="text-sm text-zinc-300">
          {user?.is_anonymous
            ? 'You’re browsing as a guest. Create a full account to submit a tool — we email you the review decision.'
            : 'Sign in to submit a tool — we email you the review decision.'}
        </p>
        <p className="text-sm text-zinc-400">
          <Link
            href={signupHref}
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Create a free account
          </Link>{' '}
          or{' '}
          <Link
            href={loginHref}
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            sign in
          </Link>
        </p>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-6 text-center space-y-1">
        <p className="text-sm text-emerald-400">{state.success}</p>
        <p className="text-xs text-zinc-500">
          A confirmation was sent to your email. The decision usually takes a few days.
        </p>
      </div>
    )
  }

  return (
    <form
      action={action}
      data-form-id="tool_submission"
      className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4"
      onFocusCapture={handleFirstFocus}
    >
      <h2 className="text-base font-semibold text-white">Tool details</h2>

      {/* Honeypot — hidden from humans; bots that fill it are silently dropped. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="s-name" className="block text-sm text-zinc-400 mb-1">
          Tool name <span className="text-red-400">*</span>
        </label>
        <input
          id="s-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          className={inputCls}
          placeholder="e.g. AcmeWriter"
        />
      </div>

      <div>
        <label htmlFor="s-url" className="block text-sm text-zinc-400 mb-1">
          Website URL <span className="text-red-400">*</span>
        </label>
        <input
          id="s-url"
          name="website_url"
          type="url"
          required
          maxLength={500}
          className={inputCls}
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="s-tagline" className="block text-sm text-zinc-400 mb-1">
          Tagline <span className="text-red-400">*</span>{' '}
          <span className="text-zinc-600">(one sentence, 10–200 chars)</span>
        </label>
        <input
          id="s-tagline"
          name="tagline"
          type="text"
          required
          minLength={10}
          maxLength={200}
          className={inputCls}
          placeholder="What it does, in one line"
        />
      </div>

      <div>
        <label htmlFor="s-desc" className="block text-sm text-zinc-400 mb-1">
          Description <span className="text-red-400">*</span>{' '}
          <span className="text-zinc-600">(what it does, who it’s for — 50–2,000 chars)</span>
        </label>
        <textarea
          id="s-desc"
          name="description"
          rows={5}
          required
          minLength={50}
          maxLength={2000}
          className={`${inputCls} resize-none`}
          placeholder="Describe the tool's core AI capability, main use cases, and the kind of user it fits best..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-pricing" className="block text-sm text-zinc-400 mb-1">
            Pricing model <span className="text-red-400">*</span>
          </label>
          <select id="s-pricing" name="pricing_type" required className={inputCls} defaultValue="freemium">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
            <option value="contact">Contact for pricing</option>
          </select>
        </div>
        <div>
          <label htmlFor="s-role" className="block text-sm text-zinc-400 mb-1">
            Your relationship to the tool <span className="text-red-400">*</span>
          </label>
          <select id="s-role" name="submitter_role" required className={inputCls} defaultValue="founder">
            <option value="founder">Founder / maker</option>
            <option value="employee">Work there</option>
            <option value="agency">Agency / on their behalf</option>
            <option value="user">Just a user who likes it</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="s-cats" className="block text-sm text-zinc-400 mb-1">
          Categories <span className="text-zinc-600">(optional — e.g. “code assistant, image generation”)</span>
        </label>
        <input
          id="s-cats"
          name="categories_freetext"
          type="text"
          maxLength={300}
          className={inputCls}
          placeholder="Where would you expect to find it?"
        />
      </div>

      <div>
        <label htmlFor="s-logo" className="block text-sm text-zinc-400 mb-1">
          Logo URL <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          id="s-logo"
          name="logo_url"
          type="url"
          maxLength={500}
          className={inputCls}
          placeholder="https://.../logo.png"
        />
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Submitting...' : 'Submit for review'}
      </button>
      <p className="text-xs text-zinc-600">
        Free. Editorially reviewed. Never affects rankings or recommendations.
      </p>
    </form>
  )
}

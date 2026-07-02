'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { slugify } from '@/lib/utils/slugify'
import { normalizeDomain, MULTI_TENANT_HOSTS } from '@/lib/cron/dedup'
import {
  sendSubmissionReceivedEmail,
  sendAdminNewSubmissionEmail,
} from '@/lib/submissions/emails'
import { serverAnalytics } from '@/lib/mixpanel-server'

type ActionState = { error?: string; success?: string } | null

// Phase 14 — free vendor tool-submission funnel. Writes to tool_submissions
// (moderated queue), NEVER to tools: a human approves at /admin/submissions,
// which creates the draft row; the onboard SOP remains the only publish path.
// Submission never influences rankings/recommendations (integrity constraint).

const PRICING_TYPES = new Set(['free', 'freemium', 'paid', 'contact'])
const SUBMITTER_ROLES = new Set(['founder', 'employee', 'agency', 'user', 'other'])
const MAX_PENDING_PER_USER = 3

export async function submitTool(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Guests are real anonymous Supabase sessions — they can't receive the
  // decision email, and RLS blocks them anyway (defense in depth).
  if (!user || user.is_anonymous || !user.email) {
    return { error: 'You must be signed in with a full account to submit a tool.' }
  }

  // Honeypot: hidden field real users never fill. Silently "accept" so bots
  // don't learn they were caught; nothing is stored.
  const honeypot = (formData.get('company_website') as string)?.trim()
  if (honeypot) {
    void serverAnalytics.toolSubmissionFailed(user.id, 'honeypot')
    return { success: 'Submitted — our editorial team reviews every tool. We will email you the decision.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const websiteUrl = (formData.get('website_url') as string)?.trim()
  const tagline = (formData.get('tagline') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const pricingType = (formData.get('pricing_type') as string)?.trim()
  const categoriesFreetext = (formData.get('categories_freetext') as string)?.trim() || null
  const logoUrl = (formData.get('logo_url') as string)?.trim() || null
  const submitterRole = (formData.get('submitter_role') as string)?.trim() || 'other'

  if (!name || !websiteUrl || !tagline || !description || !pricingType) {
    return { error: 'Please fill in all required fields.' }
  }
  if (name.length < 2 || name.length > 100) {
    return { error: 'Tool name must be 2–100 characters.' }
  }
  if (tagline.length < 10 || tagline.length > 200) {
    return { error: 'Tagline must be 10–200 characters.' }
  }
  if (description.length < 50 || description.length > 2000) {
    return { error: 'Description must be 50–2,000 characters — tell us what it does and who it is for.' }
  }
  if (!PRICING_TYPES.has(pricingType)) {
    return { error: 'Please pick a valid pricing model.' }
  }
  if (!SUBMITTER_ROLES.has(submitterRole)) {
    return { error: 'Please pick a valid relationship option.' }
  }
  if (categoriesFreetext && categoriesFreetext.length > 300) {
    return { error: 'Categories text is too long.' }
  }

  for (const [label, value] of [
    ['Website URL', websiteUrl],
    ['Logo URL', logoUrl],
  ] as const) {
    if (!value) continue
    if (value.length > 500) return { error: `${label} is too long.` }
    try {
      const parsed = new URL(value)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { error: `${label} must start with http:// or https://.` }
      }
    } catch {
      return { error: `${label} doesn't look like a valid URL.` }
    }
  }

  const proposedSlug = slugify(name)
  const domain = normalizeDomain(websiteUrl)
  const domainUsable = !!domain && !MULTI_TENANT_HOSTS.has(domain)

  // Dedupe reads use the service-role client: the public tools SELECT policy
  // hides drafts (is_published=false), and tool_submissions RLS hides other
  // users' pending rows — both must count as duplicates here.
  const admin = getAdminClient()

  // Dedupe vs the whole catalog (drafts included): exact slug or
  // (non-multi-tenant) domain match.
  const orFilters = [`slug.eq.${proposedSlug}`]
  if (domainUsable) orFilters.push(`website_url.ilike.%${domain}%`)
  const { data: existingToolsRaw } = await admin
    .from('tools')
    .select('id, slug, name, is_published, website_url')
    .or(orFilters.join(','))
    .limit(5)
  const existingTools = (existingToolsRaw ?? []) as {
    id: string
    slug: string
    name: string
    is_published: boolean
    website_url: string | null
  }[]

  // Same site already in the catalog (published or draft) → hard block.
  // (The ilike is a coarse prefilter; the exact normalizeDomain check here
  // rejects substring false-positives like "ai.com" matching "openai.com".)
  const domainMatch = existingTools.find(
    t => domainUsable && t.website_url && normalizeDomain(t.website_url) === domain
  )
  if (domainMatch) {
    return domainMatch.is_published
      ? { error: `This tool is already on RightAIChoice — see rightaichoice.com/tools/${domainMatch.slug}.` }
      : { error: 'This tool is already in our review pipeline.' }
  }

  // Same name/slug but a different site → allow, but store the collision as
  // a hint for the admin queue (approve re-verifies and suffixes the slug).
  const slugMatch = existingTools.find(t => t.slug === proposedSlug)
  const duplicateToolId = slugMatch?.id ?? null

  // Dedupe vs pending submissions (any submitter — needs the admin client).
  const { data: pendingDup } = await admin
    .from('tool_submissions')
    .select('id')
    .eq('normalized_domain', domain)
    .eq('status', 'pending')
    .limit(1)
  if (pendingDup && pendingDup.length > 0) {
    return { error: 'This tool has already been submitted and is awaiting review.' }
  }

  // Per-user throttle: at most 3 pending submissions at a time.
  const { count: pendingCount } = await supabase
    .from('tool_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
  if ((pendingCount ?? 0) >= MAX_PENDING_PER_USER) {
    void serverAnalytics.toolSubmissionFailed(user.id, 'cap')
    return { error: `You have ${MAX_PENDING_PER_USER} submissions in review — please wait for those decisions first.` }
  }

  // Insert via the user client so RLS is the enforcement surface.
  const { data: inserted, error } = await supabase
    .from('tool_submissions')
    .insert({
      user_id: user.id,
      name,
      website_url: websiteUrl,
      tagline,
      description,
      pricing_type: pricingType,
      categories_freetext: categoriesFreetext,
      logo_url: logoUrl,
      submitter_role: submitterRole,
      normalized_domain: domain,
      proposed_slug: proposedSlug,
      duplicate_tool_id: duplicateToolId,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: 'Failed to submit. Please try again.' }
  }

  // Best-effort side effects — never fail the submission over these.
  void serverAnalytics.toolSubmissionCompleted(user.id, inserted.id, pricingType, domain, !!logoUrl)
  void sendSubmissionReceivedEmail(user.email, name)
  void sendAdminNewSubmissionEmail({
    name,
    website_url: websiteUrl,
    tagline,
    submitter_email: user.email,
    submitter_role: submitterRole,
  })

  revalidatePath('/submit')
  return { success: 'Submitted — our editorial team reviews every tool. We will email you the decision.' }
}

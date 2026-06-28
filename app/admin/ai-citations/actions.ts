'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { requireAdmin } from '@/lib/admin/require-admin'

const ENGINES = ['chatgpt', 'claude', 'perplexity', 'google_aio', 'gemini', 'copilot', 'other'] as const
type Engine = (typeof ENGINES)[number]

/** Parse an optional positive int from a form field; '' / invalid → null. */
function optInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Log a manual AI-citation observation (doc 08). Form-action signature
 * (Promise<void>): throws on validation/db error so Next renders the error page
 * and the operator can retry — volume here is tiny (a few rows per weekly check).
 */
export async function addCitation(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin()

  const engine = String(formData.get('engine') ?? '').trim() as Engine
  if (!ENGINES.includes(engine)) throw new Error('Invalid engine')

  const query = String(formData.get('query') ?? '').trim()
  if (query.length < 2 || query.length > 300) throw new Error('Query must be 2–300 chars')

  // Unchecked checkboxes are absent from FormData → default cited=true (we
  // usually log hits; uncheck to record a "ran the query, not cited" miss).
  const cited = formData.get('cited') !== null
  const brandMention = formData.get('brand_mention') !== null

  let citedUrl = String(formData.get('cited_url') ?? '').trim() || null
  if (citedUrl) {
    // Accept a bare path (/compare/x) or a full rightaichoice.com URL; store as path.
    if (citedUrl.startsWith('https://rightaichoice.com')) citedUrl = citedUrl.slice('https://rightaichoice.com'.length) || '/'
    if (!citedUrl.startsWith('/')) throw new Error('Cited URL must be a RAC path (/...) or rightaichoice.com URL')
    if (citedUrl.length > 200) throw new Error('Cited URL too long')
  }

  const checkedOn = String(formData.get('checked_on') ?? '').trim() || null // null → DB default current_date
  const notes = String(formData.get('notes') ?? '').trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { error } = await admin.from('ai_citations').insert({
    ...(checkedOn ? { checked_on: checkedOn } : {}),
    engine,
    query,
    cited,
    cited_url: citedUrl,
    position_in_answer: optInt(formData.get('position_in_answer')),
    brand_mention: brandMention,
    notes,
    created_by: userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/ai-citations')
}

export async function deleteCitation(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Missing id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { error } = await admin.from('ai_citations').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/ai-citations')
}

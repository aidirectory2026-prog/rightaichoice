'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const CHANNELS = new Set([
  'founder_outreach',
  'data_pr',
  'haro',
  'embed_widget',
  'reddit_hn',
  'organic',
  'paid',
  'other',
])

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]
  return d
}

export async function addReferringDomain(
  formData: FormData,
): Promise<{ error?: string; domain?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Admin only' }

  const rawDomain = String(formData.get('domain') ?? '')
  if (!rawDomain) return { error: 'Domain required' }
  const domain = normalizeDomain(rawDomain)
  if (!domain.includes('.')) return { error: 'Domain looks invalid' }

  const channel = String(formData.get('source_channel') ?? '')
  if (!CHANNELS.has(channel)) return { error: 'Invalid source channel' }

  const daRaw = String(formData.get('da_estimate') ?? '').trim()
  const da = daRaw ? Number(daRaw) : null
  if (da !== null && (Number.isNaN(da) || da < 0 || da > 100)) {
    return { error: 'DA must be 0–100' }
  }

  const { error } = await supabase.from('referring_domains').insert({
    domain,
    source_channel: channel,
    da_estimate: da,
    anchor_text: (String(formData.get('anchor_text') ?? '').trim() || null) as string | null,
    target_url: (String(formData.get('target_url') ?? '').trim() || null) as string | null,
    source_url: (String(formData.get('source_url') ?? '').trim() || null) as string | null,
    notes: (String(formData.get('notes') ?? '').trim() || null) as string | null,
  })

  if (error) {
    if (error.code === '23505') return { error: `${domain} already tracked` }
    return { error: error.message }
  }

  revalidatePath('/admin/authority')
  return { domain }
}

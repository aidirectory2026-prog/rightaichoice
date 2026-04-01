'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toggleSaveTool, logPageView, logClick } from '@/lib/data/tools'

type ActionState = { error?: string; success?: string } | null

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Not authorized')
  return { supabase, user }
}

export async function createTool(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin()

    const name = formData.get('name') as string
    const tagline = formData.get('tagline') as string
    const description = formData.get('description') as string
    const website_url = formData.get('website_url') as string
    const pricing_type = formData.get('pricing_type') as string
    const skill_level = formData.get('skill_level') as string
    const has_api = formData.get('has_api') === 'true'
    const platforms = formData.getAll('platforms') as string[]
    const features = (formData.get('features') as string)?.split('\n').map(f => f.trim()).filter(Boolean) ?? []
    const integrations = (formData.get('integrations') as string)?.split('\n').map(i => i.trim()).filter(Boolean) ?? []
    const github_url = (formData.get('github_url') as string) || null
    const docs_url = (formData.get('docs_url') as string) || null
    const logo_url = (formData.get('logo_url') as string) || null
    const is_featured = formData.get('is_featured') === 'true'
    const is_sponsored = formData.get('is_sponsored') === 'true'
    const affiliate_url = (formData.get('affiliate_url') as string) || null
    const best_for = (formData.get('best_for') as string)?.split('\n').map(s => s.trim()).filter(Boolean) ?? []
    const not_for = (formData.get('not_for') as string)?.split('\n').map(s => s.trim()).filter(Boolean) ?? []
    const editorial_verdict = (formData.get('editorial_verdict') as string)?.trim() || null
    const categoryIds = formData.getAll('categories') as string[]
    const tagIds = formData.getAll('tags') as string[]

    if (!name || !tagline || !description || !website_url) {
      return { error: 'Name, tagline, description, and website URL are required.' }
    }

    const slug = slugify(name)

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return { error: `A tool with the slug "${slug}" already exists.` }
    }

    const { data: tool, error } = await supabase
      .from('tools')
      .insert({
        name,
        slug,
        tagline,
        description,
        website_url,
        pricing_type,
        skill_level,
        has_api,
        platforms,
        features,
        integrations,
        github_url,
        docs_url,
        logo_url,
        is_featured,
        is_sponsored,
        affiliate_url,
        best_for,
        not_for,
        editorial_verdict,
        last_verified_at: new Date().toISOString(),
        is_published: true,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    // Link categories
    if (categoryIds.length > 0) {
      await supabase.from('tool_categories').insert(
        categoryIds.map(cid => ({ tool_id: tool.id, category_id: cid }))
      )
    }

    // Link tags
    if (tagIds.length > 0) {
      await supabase.from('tool_tags').insert(
        tagIds.map(tid => ({ tool_id: tool.id, tag_id: tid }))
      )
    }

    revalidatePath('/admin/tools')
    return { success: `"${name}" created successfully.` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export async function updateTool(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin()

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const tagline = formData.get('tagline') as string
    const description = formData.get('description') as string
    const website_url = formData.get('website_url') as string
    const pricing_type = formData.get('pricing_type') as string
    const skill_level = formData.get('skill_level') as string
    const has_api = formData.get('has_api') === 'true'
    const platforms = formData.getAll('platforms') as string[]
    const features = (formData.get('features') as string)?.split('\n').map(f => f.trim()).filter(Boolean) ?? []
    const integrations = (formData.get('integrations') as string)?.split('\n').map(i => i.trim()).filter(Boolean) ?? []
    const github_url = (formData.get('github_url') as string) || null
    const docs_url = (formData.get('docs_url') as string) || null
    const logo_url = (formData.get('logo_url') as string) || null
    const is_featured = formData.get('is_featured') === 'true'
    const is_sponsored = formData.get('is_sponsored') === 'true'
    const affiliate_url = (formData.get('affiliate_url') as string) || null
    const best_for = (formData.get('best_for') as string)?.split('\n').map(s => s.trim()).filter(Boolean) ?? []
    const not_for = (formData.get('not_for') as string)?.split('\n').map(s => s.trim()).filter(Boolean) ?? []
    const editorial_verdict = (formData.get('editorial_verdict') as string)?.trim() || null
    const mark_verified = formData.get('mark_verified') === 'true'
    const is_published = formData.get('is_published') !== 'false'
    const categoryIds = formData.getAll('categories') as string[]
    const tagIds = formData.getAll('tags') as string[]

    if (!id || !name || !tagline || !description || !website_url) {
      return { error: 'Required fields missing.' }
    }

    const { error } = await supabase
      .from('tools')
      .update({
        name,
        tagline,
        description,
        website_url,
        pricing_type,
        skill_level,
        has_api,
        platforms,
        features,
        integrations,
        github_url,
        docs_url,
        logo_url,
        is_featured,
        is_sponsored,
        affiliate_url,
        best_for,
        not_for,
        editorial_verdict,
        is_published,
        ...(mark_verified && { last_verified_at: new Date().toISOString() }),
      })
      .eq('id', id)

    if (error) return { error: error.message }

    // Re-link categories
    await supabase.from('tool_categories').delete().eq('tool_id', id)
    if (categoryIds.length > 0) {
      await supabase.from('tool_categories').insert(
        categoryIds.map(cid => ({ tool_id: id, category_id: cid }))
      )
    }

    // Re-link tags
    await supabase.from('tool_tags').delete().eq('tool_id', id)
    if (tagIds.length > 0) {
      await supabase.from('tool_tags').insert(
        tagIds.map(tid => ({ tool_id: id, tag_id: tid }))
      )
    }

    revalidatePath('/admin/tools')
    revalidatePath(`/tools/${formData.get('slug')}`)
    return { success: `"${name}" updated successfully.` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export async function deleteTool(id: string): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from('tools').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/admin/tools')
    return { success: 'Tool deleted.' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export async function toggleToolPublished(id: string, isPublished: boolean): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
      .from('tools')
      .update({ is_published: isPublished })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/tools')
    return { success: isPublished ? 'Tool published.' : 'Tool unpublished.' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

// ── User-facing actions ─────────────────────────────────────────────────────

export async function toggleSave(toolId: string): Promise<{ saved: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { saved: false, error: 'Not authenticated' }

  const saved = await toggleSaveTool(toolId, user.id)
  return { saved, error: null }
}

export async function recordPageView(path: string, toolId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await logPageView(path, toolId, user?.id)
}

export async function recordClick(toolId: string, source: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await logClick(toolId, source, user?.id)
}

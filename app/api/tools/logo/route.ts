import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
// H11c (Cowork QA): SVG removed — SVGs can carry inline <script>/onload handlers
// and this bucket is public, so an uploaded SVG served as image/svg+xml is
// stored-XSS the moment it's rendered inline.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  // Cowork QA: profiles has no `role` column (the gate is is_admin) — the old
  // `profile.role !== 'admin'` check always 403'd. Use is_admin, consistent with
  // every other admin gate.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const toolSlug = formData.get('slug') as string | null

  if (!file || !toolSlug) {
    return NextResponse.json({ error: 'File and slug are required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, and WebP files are allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
  }

  // Generate file path: tool-logos/{slug}.{ext}
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${toolSlug}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('tool-logos')
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('tool-logos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}

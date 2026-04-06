import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/tools/search?q=<query>
 * Lightweight tool search for the compare tray.
 * Returns id, name, slug, logo_url — max 6 results.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) {
    return NextResponse.json({ tools: [] })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, logo_url')
    .eq('is_published', true)
    .or(`name.ilike.%${q}%,tagline.ilike.%${q}%`)
    .order('view_count', { ascending: false })
    .limit(6)

  return NextResponse.json({ tools: data ?? [] })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tool } = await supabase
    .from('tools')
    .select('id, website_url, affiliate_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Determine destination — prefer affiliate URL when set
  const destination = tool.affiliate_url ?? tool.website_url
  const isAffiliate = !!tool.affiliate_url

  // Log click — fire and forget
  const { data: { user } } = await supabase.auth.getUser()
  void supabase.from('click_logs').insert({
    tool_id: tool.id,
    user_id: user?.id ?? null,
    source: isAffiliate ? 'affiliate_redirect' : 'visit_redirect',
  })

  return NextResponse.redirect(destination, { status: 302 })
}

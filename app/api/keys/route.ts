import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/keys — list current user's API keys
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, requests_total, last_used_at, is_active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/keys — create a new API key
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = (body.name as string)?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // Enforce max 5 keys per user
  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum of 5 active API keys allowed' }, { status: 400 })
  }

  // Generate key: rac_ + 32 random hex chars
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const key = `rac_${raw}`
  const key_prefix = key.slice(0, 12) // "rac_" + 8 hex chars

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, name, key, key_prefix })
    .select('id, name, key, key_prefix, requests_total, last_used_at, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the full key once — caller must store it
  return NextResponse.json(data, { status: 201 })
}

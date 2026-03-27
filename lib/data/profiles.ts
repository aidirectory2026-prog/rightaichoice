import { createClient } from '@/lib/supabase/server'

export async function getProfile(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  return data
}

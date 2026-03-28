'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const website_url = (formData.get('website_url') as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, bio, website_url, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: 'Profile updated.' }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

const AVATAR_BUCKET = 'user-avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_AVATAR_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

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

  // Optional avatar upload bundled with the form submit.
  const avatarFile = formData.get('avatar') as File | null
  const updates: Record<string, unknown> = {
    full_name,
    bio,
    website_url,
    updated_at: new Date().toISOString(),
  }

  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_AVATAR_MIME.has(avatarFile.type)) {
      return { error: 'Avatar must be PNG, JPEG, or WebP.' }
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: 'Avatar must be 2 MB or smaller.' }
    }
    const ext = MIME_TO_EXT[avatarFile.type] ?? 'png'
    const objectKey = `${user.id}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(objectKey, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
        cacheControl: '3600',
      })
    if (uploadErr) return { error: `Avatar upload failed: ${uploadErr.message}` }

    const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectKey)
    // Cache-bust so the browser picks up the new image after upsert
    updates.avatar_url = `${publicUrlData.publicUrl}?v=${Date.now()}`
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/u/${user.id}`)
  return { success: 'Profile updated.' }
}

export async function removeAvatar(): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Try removing all known extensions; ignore errors (file may not exist for some).
  await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.webp`])

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/u/${user.id}`)
  return { success: 'Avatar removed.' }
}

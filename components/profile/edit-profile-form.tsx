'use client'

import Image from 'next/image'
import { useActionState, useRef, useState, useTransition } from 'react'
import { removeAvatar, updateProfile } from '@/actions/profile'

type ProfileData = {
  full_name: string | null
  bio: string | null
  website_url: string | null
  avatar_url: string | null
}

export function EditProfileForm({ profile }: { profile: ProfileData }) {
  const [state, action, isPending] = useActionState(updateProfile, null)
  const [removeState, setRemoveState] = useState<{ error?: string; success?: string } | null>(null)
  const [isRemoving, startRemove] = useTransition()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setPreviewUrl(null)
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeAvatar()
      setRemoveState(result)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  const displayedAvatar = previewUrl ?? profile.avatar_url

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Profile photo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
            {displayedAvatar ? (
              <Image
                src={displayedAvatar}
                alt="Profile preview"
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs text-zinc-600">No photo</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-700"
            />
            <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-600">
              <span>PNG / JPEG / WebP, max 2 MB.</span>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {isRemoving ? 'Removing…' : 'Remove photo'}
                </button>
              )}
            </div>
            {removeState?.error && <p className="mt-1 text-xs text-red-400">{removeState.error}</p>}
            {removeState?.success && <p className="mt-1 text-xs text-emerald-400">{removeState.success}</p>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-zinc-400 mb-1">
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={profile.full_name ?? ''}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-zinc-400 mb-1">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ''}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="Tell others about yourself..."
        />
      </div>

      <div>
        <label htmlFor="website_url" className="block text-sm font-medium text-zinc-400 mb-1">
          Website
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          defaultValue={profile.website_url ?? ''}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          placeholder="https://yoursite.com"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-400">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

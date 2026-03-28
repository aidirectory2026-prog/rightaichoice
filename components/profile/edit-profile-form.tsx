'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/actions/profile'

type ProfileData = {
  full_name: string | null
  bio: string | null
  website_url: string | null
}

export function EditProfileForm({ profile }: { profile: ProfileData }) {
  const [state, action, isPending] = useActionState(updateProfile, null)

  return (
    <form action={action} className="space-y-4">
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

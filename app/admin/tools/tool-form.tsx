'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { createTool, updateTool } from '@/actions/tools'
import { LogoUpload } from '@/components/admin/logo-upload'

type ToolData = {
  id?: string
  name?: string
  slug?: string
  tagline?: string
  description?: string
  website_url?: string
  pricing_type?: string
  skill_level?: string
  has_api?: boolean
  platforms?: string[]
  features?: string[]
  integrations?: string[]
  github_url?: string | null
  docs_url?: string | null
  logo_url?: string | null
  is_featured?: boolean
  is_published?: boolean
  is_sponsored?: boolean
  affiliate_url?: string | null
  categoryIds?: string[]
  tagIds?: string[]
}

type CategoryOption = { id: string; name: string }
type TagOption = { id: string; name: string }

export function ToolForm({ tool, categories, tags }: {
  tool?: ToolData
  categories: CategoryOption[]
  tags: TagOption[]
}) {
  const isEdit = !!tool?.id
  const action = isEdit ? updateTool : createTool
  const [state, formAction, isPending] = useActionState(action, null)
  const [logoUrl, setLogoUrl] = useState(tool?.logo_url ?? '')

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {tool?.id && <input type="hidden" name="id" value={tool.id} />}
      {tool?.slug && <input type="hidden" name="slug" value={tool.slug} />}

      {state?.error && (
        <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-sm px-4 py-3 rounded-lg">
          {state.success}
        </div>
      )}

      {/* Core info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-zinc-300 mb-2">Core Information</legend>

        <div>
          <label htmlFor="name" className="block text-xs text-zinc-400 mb-1">Name *</label>
          <input
            id="name" name="name" required
            defaultValue={tool?.name ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            placeholder="e.g. ChatGPT"
          />
        </div>

        <div>
          <label htmlFor="tagline" className="block text-xs text-zinc-400 mb-1">Tagline *</label>
          <input
            id="tagline" name="tagline" required
            defaultValue={tool?.tagline ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            placeholder="One-line description"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs text-zinc-400 mb-1">Description *</label>
          <textarea
            id="description" name="description" required rows={4}
            defaultValue={tool?.description ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-y"
            placeholder="Detailed description of what this tool does"
          />
        </div>

        <div>
          <label htmlFor="website_url" className="block text-xs text-zinc-400 mb-1">Website URL *</label>
          <input
            id="website_url" name="website_url" type="url" required
            defaultValue={tool?.website_url ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <input type="hidden" name="logo_url" value={logoUrl} />
          <LogoUpload
            currentUrl={tool?.logo_url}
            toolSlug={tool?.slug}
            onUploaded={setLogoUrl}
          />
          {!isEdit && (
            <p className="mt-1 text-[11px] text-amber-500/80">
              Create the tool first, then edit it to upload a logo.
            </p>
          )}
        </div>
      </fieldset>

      {/* Classification */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-zinc-300 mb-2">Classification</legend>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="pricing_type" className="block text-xs text-zinc-400 mb-1">Pricing</label>
            <select
              id="pricing_type" name="pricing_type"
              defaultValue={tool?.pricing_type ?? 'freemium'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
              <option value="contact">Contact</option>
            </select>
          </div>
          <div>
            <label htmlFor="skill_level" className="block text-xs text-zinc-400 mb-1">Skill Level</label>
            <select
              id="skill_level" name="skill_level"
              defaultValue={tool?.skill_level ?? 'beginner'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Has API?</label>
            <select
              name="has_api"
              defaultValue={tool?.has_api ? 'true' : 'false'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-xs text-zinc-400 mb-2">Platforms</label>
          <div className="flex flex-wrap gap-3">
            {['web', 'mobile', 'desktop', 'api', 'plugin', 'cli'].map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm text-zinc-300">
                <input
                  type="checkbox" name="platforms" value={p}
                  defaultChecked={tool?.platforms?.includes(p)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-600"
                />
                {p}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Categories & Tags */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-zinc-300 mb-2">Categories & Tags</legend>

        <div>
          <label className="block text-xs text-zinc-400 mb-2">Categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm text-zinc-300">
                <input
                  type="checkbox" name="categories" value={c.id}
                  defaultChecked={tool?.categoryIds?.includes(c.id)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-600"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input
                  type="checkbox" name="tags" value={t.id}
                  defaultChecked={tool?.tagIds?.includes(t.id)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-600"
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-zinc-300 mb-2">Details</legend>

        <div>
          <label htmlFor="features" className="block text-xs text-zinc-400 mb-1">Features (one per line)</label>
          <textarea
            id="features" name="features" rows={4}
            defaultValue={tool?.features?.join('\n') ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-y"
            placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
          />
        </div>

        <div>
          <label htmlFor="integrations" className="block text-xs text-zinc-400 mb-1">Integrations (one per line)</label>
          <textarea
            id="integrations" name="integrations" rows={3}
            defaultValue={tool?.integrations?.join('\n') ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-y"
            placeholder="Slack&#10;Google Drive&#10;Zapier"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="github_url" className="block text-xs text-zinc-400 mb-1">GitHub URL</label>
            <input
              id="github_url" name="github_url" type="url"
              defaultValue={tool?.github_url ?? ''}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="docs_url" className="block text-xs text-zinc-400 mb-1">Docs URL</label>
            <input
              id="docs_url" name="docs_url" type="url"
              defaultValue={tool?.docs_url ?? ''}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      </fieldset>

      {/* Flags */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-300 mb-2">Visibility & Monetization</legend>
        <div className="flex items-center gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <select
              name="is_featured"
              defaultValue={tool?.is_featured ? 'true' : 'false'}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="false">Not featured</option>
              <option value="true">Featured</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <select
              name="is_sponsored"
              defaultValue={tool?.is_sponsored ? 'true' : 'false'}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-600"
            >
              <option value="false">Not sponsored</option>
              <option value="true">Sponsored</option>
            </select>
          </label>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <select
                name="is_published"
                defaultValue={tool?.is_published !== false ? 'true' : 'false'}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-600"
              >
                <option value="true">Published</option>
                <option value="false">Draft</option>
              </select>
            </label>
          )}
        </div>
        <div>
          <label htmlFor="affiliate_url" className="block text-xs text-zinc-400 mb-1">
            Affiliate URL <span className="text-zinc-600">(optional — overrides website link for tracked outbound clicks)</span>
          </label>
          <input
            id="affiliate_url" name="affiliate_url" type="url"
            defaultValue={tool?.affiliate_url ?? ''}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            placeholder="https://partner.example.com/ref=rac"
          />
        </div>
      </fieldset>

      <div className="pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? 'Saving...' : isEdit ? 'Update Tool' : 'Create Tool'}
        </button>
      </div>
    </form>
  )
}

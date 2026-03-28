import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolActions } from './tool-actions'

export const metadata = { title: 'Manage Tools' }

export default async function AdminToolsPage() {
  const supabase = await createClient()

  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, slug, pricing_type, is_published, is_featured, is_sponsored, avg_rating, review_count, view_count, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="text-red-400">Failed to load tools: {error.message}</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tools</h1>
          <p className="text-sm text-zinc-500 mt-1">{tools?.length ?? 0} tools in database</p>
        </div>
        <Link
          href="/admin/tools/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Tool
        </Link>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Pricing</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Rating</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Views</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tools?.map((tool) => (
              <tr key={tool.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-white">{tool.name}</span>
                    {tool.is_featured && (
                      <span className="ml-2 text-[10px] font-medium text-amber-400 bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    {tool.is_sponsored && (
                      <span className="ml-1 text-[10px] font-medium text-blue-400 bg-blue-950 border border-blue-800 px-1.5 py-0.5 rounded">
                        Sponsored
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">/{tool.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-zinc-400 capitalize">{tool.pricing_type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-zinc-400">
                    {Number(tool.avg_rating) > 0 ? `${tool.avg_rating} (${tool.review_count})` : 'No reviews'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-zinc-400">{tool.view_count}</span>
                </td>
                <td className="px-4 py-3">
                  {tool.is_published ? (
                    <span className="text-xs text-emerald-400">Published</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Draft</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <ToolActions id={tool.id} slug={tool.slug} name={tool.name} isPublished={tool.is_published} />
                </td>
              </tr>
            ))}
            {(!tools || tools.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No tools yet. Run the seed migration or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

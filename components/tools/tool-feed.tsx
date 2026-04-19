import { ExternalLink } from 'lucide-react'
import { fetchToolFeed } from '@/lib/tool-feed'

interface ToolFeedProps {
  feedUrl: string
  limit?: number
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function ToolFeed({ feedUrl, limit = 5 }: ToolFeedProps) {
  const items = await fetchToolFeed(feedUrl, limit)
  if (items.length === 0) return null

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent changes</h2>
        <a
          href={feedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Feed
        </a>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.url} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-800">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
            >
              <span className="inline-flex items-center gap-1">
                {item.title}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </span>
            </a>
            {item.date && (
              <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(item.date)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

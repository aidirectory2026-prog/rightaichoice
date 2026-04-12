import Link from 'next/link'
import { TrackedBlogLink } from '@/components/blog/tracked-blog-link'

export function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'border-blue-800 bg-blue-950/50 text-blue-300',
    warning: 'border-amber-800 bg-amber-950/50 text-amber-300',
    tip: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
  }

  const icons = { info: 'i', warning: '!', tip: '*' }

  return (
    <div className={`my-6 rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
          {icons[type]}
        </span>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function ToolMention({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:border-zinc-600 transition-colors"
    >
      {name}
    </Link>
  )
}

export function ComparisonTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-zinc-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-zinc-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Default MDX component overrides for consistent styling */
export const mdxComponents = {
  Callout,
  ToolMention,
  ComparisonTable,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mt-10 mb-4 text-3xl font-bold text-white" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-8 mb-3 text-2xl font-bold text-white" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-6 mb-2 text-xl font-semibold text-white" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-base leading-relaxed text-zinc-300" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-zinc-300" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-zinc-300" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-base leading-relaxed" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <TrackedBlogLink {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-6 border-l-2 border-zinc-700 pl-4 italic text-zinc-400" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-emerald-400" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="my-6 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm" {...props} />
  ),
  hr: () => <hr className="my-8 border-zinc-800" />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
}

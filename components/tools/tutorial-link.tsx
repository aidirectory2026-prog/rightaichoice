import { BookOpen, Code2, Rocket, FileText, Layers, GraduationCap, Boxes, Lightbulb, ExternalLink } from 'lucide-react'

type Kind = {
  label: string
  Icon: typeof BookOpen
  hint: string
}

function classify(path: string): Kind {
  const p = path.toLowerCase()
  if (/(^|\/)quickstart|getting-started|quick-start/.test(p)) return { label: 'Quickstart', Icon: Rocket, hint: 'Get up and running fast' }
  if (/(^|\/)examples?(\/|$)/.test(p)) return { label: 'Examples', Icon: Layers, hint: 'Working sample projects' }
  if (/(^|\/)tutorials?(\/|$)/.test(p)) return { label: 'Tutorial', Icon: GraduationCap, hint: 'Step-by-step walkthrough' }
  if (/(^|\/)guides?(\/|$)/.test(p)) return { label: 'Guide', Icon: BookOpen, hint: 'In-depth how-to' }
  if (/(^|\/)(api|reference|sdk|cli)(\/|$)/.test(p)) return { label: 'API Reference', Icon: Code2, hint: 'Methods, params, types' }
  if (/(^|\/)concepts?(\/|$)/.test(p)) return { label: 'Concepts', Icon: Lightbulb, hint: 'Core ideas explained' }
  if (/(^|\/)learn(\/|$)/.test(p)) return { label: 'Learn', Icon: GraduationCap, hint: 'Educational content' }
  if (/(^|\/)recipes?(\/|$)/.test(p)) return { label: 'Recipes', Icon: Boxes, hint: 'Ready-made patterns' }
  if (/(^|\/)docs?(\/|$)/.test(p)) return { label: 'Documentation', Icon: FileText, hint: 'Full product docs' }
  return { label: 'Resource', Icon: BookOpen, hint: 'Helpful link' }
}

function titleFromPath(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length === 0) return 'Home'
  let last = decodeURIComponent(segs[segs.length - 1]).replace(/\.[a-z]{2,4}$/i, '')
  last = last.replace(/[-_]+/g, ' ').trim()
  if (!last) return segs[segs.length - 2] ?? 'Page'
  return last.replace(/\b\w/g, (c) => c.toUpperCase())
}

export type TutorialLinkInput =
  | string
  | { url: string; title?: string | null; description?: string | null }

export function TutorialLink({ item, toolName }: { item: TutorialLinkInput; toolName: string }) {
  const url = typeof item === 'string' ? item : item.url
  const realTitle = typeof item === 'string' ? '' : (item.title ?? '').trim()
  const realDesc = typeof item === 'string' ? '' : (item.description ?? '').trim()

  let host = url
  let pathname = '/'
  try {
    const u = new URL(url)
    host = u.hostname.replace(/^www\./, '')
    pathname = u.pathname
  } catch {
    /* keep raw */
  }
  const kind = classify(pathname)
  const title = realTitle || titleFromPath(pathname)
  const description = realDesc || `${kind.hint} from ${host}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-950/40 ring-1 ring-blue-900/40">
        <kind.Icon className="h-4 w-4 text-blue-300" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-900/40 bg-blue-950/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-200">
            {kind.label}
          </span>
          <span className="truncate text-xs text-zinc-500">{host}</span>
        </div>
        <h3 className="mt-1 text-sm font-medium text-white group-hover:text-blue-200 line-clamp-2">
          {title}
          {!realTitle && <span className="text-zinc-500 font-normal"> · {toolName}</span>}
        </h3>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{description}</p>
      </div>
      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-300" aria-hidden />
    </a>
  )
}

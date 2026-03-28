import Link from 'next/link'
import { ArrowRight, ChevronRight, ThumbsUp, Sparkles } from 'lucide-react'
import type { Workflow } from '@/types'

type Props = {
  workflow: Workflow
}

export function WorkflowCard({ workflow }: Props) {
  const toolNames = [...new Set(workflow.steps.map((s) => s.tool_name))].slice(0, 4)

  return (
    <Link
      href={`/workflows/${workflow.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 text-sm leading-snug">
          {workflow.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
          <ThumbsUp className="h-3 w-3" />
          {workflow.upvotes}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{workflow.description}</p>

      {/* Tool chain preview */}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto">
        {toolNames.map((name, i) => (
          <span key={name} className="flex items-center gap-1">
            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {name}
            </span>
            {i < toolNames.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
          </span>
        ))}
        {workflow.steps.length > 4 && (
          <span className="text-[10px] text-zinc-600">+{workflow.steps.length - 4} more</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          {workflow.is_ai_generated && (
            <>
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span>AI Generated</span>
            </>
          )}
          {workflow.profile?.username && !workflow.is_ai_generated && (
            <span>by @{workflow.profile.username}</span>
          )}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
      </div>
    </Link>
  )
}

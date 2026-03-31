import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StackStage } from '@/lib/data/stacks'

export function StackStageCard({ stage, index }: { stage: StackStage; index: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      {/* Stage header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-xs font-bold text-emerald-400">
          {index + 1}
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{stage.name}</h3>
          <p className="text-xs text-zinc-500">{stage.description}</p>
        </div>
        <span className="ml-auto text-xs text-zinc-600 whitespace-nowrap">{stage.costEstimate}</span>
      </div>

      {/* Best pick */}
      <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded px-1.5 py-0.5">
            Best Pick
          </span>
          <Link
            href={`/tools/${stage.bestPick.slug}`}
            className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors"
          >
            {stage.bestPick.name}
          </Link>
          <span className="text-xs text-zinc-500 ml-auto">{stage.bestPick.pricing}</span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">{stage.bestPick.reason}</p>
        {stage.bestPick.tags && stage.bestPick.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {stage.bestPick.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alternatives */}
      {stage.alternatives.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Alternatives</span>
          {stage.alternatives.map((alt) => (
            <div key={alt.slug} className="flex items-start gap-3 rounded-lg bg-zinc-900/50 p-3">
              <Link
                href={`/tools/${alt.slug}`}
                className="text-sm font-medium text-zinc-300 hover:text-emerald-400 transition-colors shrink-0"
              >
                {alt.name}
              </Link>
              <p className="text-xs text-zinc-500 flex-1">{alt.reason}</p>
              <span className="text-xs text-zinc-600 shrink-0">{alt.pricing}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

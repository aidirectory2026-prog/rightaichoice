import Link from 'next/link'
import { Sparkles, DollarSign, Gauge, Clock } from 'lucide-react'
import type { StackConfig } from '@/lib/data/stacks'

export function StackSummary({ stack }: { stack: StackConfig }) {
  const { summary } = stack

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="text-base font-semibold text-white mb-4">Stack Summary</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/50 border border-emerald-800/40">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Free Path</p>
            <p className="text-sm font-medium text-white">{summary.freePath}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-950/50 border border-amber-800/40">
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Paid Path</p>
            <p className="text-sm font-medium text-white">{summary.paidPath}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-950/50 border border-blue-800/40">
            <Gauge className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Skill Level</p>
            <p className="text-sm font-medium text-white">{summary.skillLevel}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-950/50 border border-purple-800/40">
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Setup Time</p>
            <p className="text-sm font-medium text-white">{summary.setupTime}</p>
          </div>
        </div>
      </div>

      <Link
        href={`/plan?q=${encodeURIComponent(stack.goal)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Customize This Stack
      </Link>
    </div>
  )
}

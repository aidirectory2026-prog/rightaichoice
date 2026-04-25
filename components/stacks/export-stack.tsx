'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'

type ExportStackProps = {
  title: string
  goal: string
  stages: { name: string; bestPick: { name: string; pricing: string }; alternatives?: { name: string }[] }[]
  summary?: { freePath?: string; paidPath?: string }
  shareUrl: string
}

export function ExportStack({ title, goal, stages, summary, shareUrl }: ExportStackProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${shareUrl}`
    : `https://rightaichoice.com${shareUrl}`

  function generateMarkdown() {
    const lines = [`# ${title}`, '', `**Goal:** ${goal}`, '']

    stages.forEach((stage, i) => {
      lines.push(`## ${i + 1}. ${stage.name}`)
      lines.push(`- **Best pick:** ${stage.bestPick.name} (${stage.bestPick.pricing})`)
      if (stage.alternatives?.length) {
        lines.push(`- **Alternatives:** ${stage.alternatives.map(a => a.name).join(', ')}`)
      }
      lines.push('')
    })

    if (summary) {
      lines.push('---')
      if (summary.freePath) lines.push(`**Free path:** ${summary.freePath}`)
      if (summary.paidPath) lines.push(`**Paid path:** ${summary.paidPath}`)
      lines.push('')
    }

    lines.push(`*Built with [RightAIChoice](${fullUrl})*`)
    return lines.join('\n')
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(generateMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareToX() {
    const stageCount = stages.length
    const costInfo = summary?.paidPath ? ` (${stageCount} tools, ${summary.paidPath} total)` : ''
    const text = `Here's the exact AI stack for ${goal}${costInfo} — ${fullUrl}`
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
    setShowMenu(false)
  }

  function shareToLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`, '_blank')
    setShowMenu(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setShowMenu(false)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={copyMarkdown}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 min-h-[40px] text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy as Markdown'}
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 min-h-[40px] text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              <button
                onClick={shareToX}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Share on X
              </button>
              <button
                onClick={shareToLinkedIn}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Share on LinkedIn
              </button>
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Copy link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

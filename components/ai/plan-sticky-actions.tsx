'use client'

import { useEffect, useState } from 'react'
import { Save, Share2, RotateCw, Plus } from 'lucide-react'

// Phase 9 Stage 3 (2026-05-16): floating action bar that follows the user
// as they scroll through the result. Desktop: top-right floating; mobile:
// bottom-of-screen above the mobile nav (z-30, below the mobile-nav z-50).
//
// Visibility rule: shows after the user has scrolled past ~600px from the
// top of the result (i.e. past the hero + summary cards). Hides if not
// scrolled OR if the existing in-place actions are visible.

type Props = {
  onSave: () => void
  onShare: () => void
  onReplan: () => void
  onNewGoal: () => void
}

export function PlanStickyActions({ onSave, onShare, onReplan, onNewGoal }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Desktop: floating top-right */}
      <div
        className="hidden lg:flex fixed top-20 right-6 z-40 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl px-2 py-1.5"
        role="toolbar"
        aria-label="Plan actions"
      >
        <ActionButton icon={<Save className="h-4 w-4" />} label="Save" onClick={onSave} />
        <ActionButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={onShare} />
        <ActionButton icon={<RotateCw className="h-4 w-4" />} label="Re-plan" onClick={onReplan} />
        <span className="w-px h-5 bg-zinc-800 mx-0.5" />
        <ActionButton icon={<Plus className="h-4 w-4" />} label="New" onClick={onNewGoal} primary />
      </div>

      {/* Mobile: bottom bar above the mobile-nav (which sits at z-50, 60px tall) */}
      <div
        className="lg:hidden fixed left-3 right-3 z-30 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl flex items-center justify-around gap-1 p-2"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        role="toolbar"
        aria-label="Plan actions"
      >
        <ActionButton icon={<Save className="h-4 w-4" />} label="Save" onClick={onSave} small />
        <ActionButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={onShare} small />
        <ActionButton icon={<RotateCw className="h-4 w-4" />} label="Re-plan" onClick={onReplan} small />
        <ActionButton icon={<Plus className="h-4 w-4" />} label="New" onClick={onNewGoal} small primary />
      </div>
    </>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
  small,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
  small?: boolean
}) {
  const base = primary
    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
    : 'hover:bg-zinc-800/70 text-zinc-300 hover:text-white'
  const padding = small ? 'px-2 py-1.5' : 'px-3 py-1.5'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${padding} ${base}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

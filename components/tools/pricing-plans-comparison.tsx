import { LayoutGrid } from 'lucide-react'

// Phase 3 / Phase 4 SOP (added 2026-05-07): "Plans compared" — for each
// published pricing tier, show the price (from pricing_details), the persona
// it fits (from pricing_plan_guides.ideal_for), and what this tier adds vs
// the previous tier (key_difference). Joins the two arrays by plan_name.
//
// Renders nothing when either source is empty (free-only tools, contact-
// sales-only tools, or tools the SOP hasn't refreshed yet).

type PricingTier = {
  plan?: string
  price?: string
  features?: string[]
}

type PlanGuide = {
  plan_name: string
  ideal_for: string
  key_difference: string
}

function findGuide(guides: PlanGuide[], planName: string): PlanGuide | undefined {
  const target = planName.trim().toLowerCase()
  return guides.find((g) => g.plan_name.trim().toLowerCase() === target)
}

export function PricingPlansComparison({
  toolName,
  pricingDetails,
  pricingPlanGuides,
}: {
  toolName: string
  pricingDetails: PricingTier[] | null | undefined
  pricingPlanGuides: PlanGuide[] | null | undefined
}) {
  const tiers = (pricingDetails ?? []).filter((t) => t && t.plan)
  const guides = (pricingPlanGuides ?? []).filter((g) => g && g.plan_name)
  if (tiers.length === 0 || guides.length === 0) {
    if (process.env.NODE_ENV !== 'production' && tiers.length > 0 && guides.length === 0) {
      console.warn(`[PricingPlansComparison] no pricing_plan_guides for ${toolName} — Phase 4 SOP will populate.`)
    }
    return null
  }

  return (
    <section id="plans-compared" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-emerald-400" />
        Plans compared
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        For each published {toolName} tier: who it actually fits, and what it adds vs. the previous tier. Cross-reference the cost calculator above for projected annual outlay.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiers.map((tier, i) => {
          const planName = tier.plan ?? `Tier ${i + 1}`
          const guide = findGuide(guides, planName)
          return (
            <div
              key={`${planName}-${i}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col"
            >
              <div className="mb-2">
                <p className="text-sm font-semibold text-white">{planName}</p>
                {tier.price && (
                  <p className="mt-0.5 text-xs text-emerald-400 font-medium">{tier.price}</p>
                )}
              </div>

              {guide?.ideal_for && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 mb-1">
                    Ideal for
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{guide.ideal_for}</p>
                </div>
              )}

              {guide?.key_difference && (
                <div className="mt-auto pt-3 border-t border-zinc-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 mb-1">
                    What this tier adds
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{guide.key_difference}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

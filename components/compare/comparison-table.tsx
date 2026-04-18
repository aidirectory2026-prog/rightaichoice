import Link from 'next/link'
import {
  Star,
  Check,
  X,
  Globe,
  ExternalLink,
} from 'lucide-react'
import { pricingLabel, pricingColor, formatNumber } from '@/lib/utils'
import { ToolLogo } from '@/components/tools/tool-logo'

type ComparedTool = {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  logo_url: string | null
  website_url: string
  pricing_type: string
  skill_level: string
  has_api: boolean
  platforms: string[] | null
  features: string[] | null
  integrations: string[] | null
  avg_rating: number
  review_count: number
  view_count: number
  pricing_details: { name: string; price: string }[] | null
  tool_categories?: { categories: { name: string; slug: string; icon: string | null } }[]
  tool_tags?: { tags: { name: string; slug: string } }[]
}

const skillLabels: Record<string, string> = {
  beginner: 'Beginner-friendly',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const platformLabels: Record<string, string> = {
  web: 'Web',
  mobile: 'Mobile',
  desktop: 'Desktop',
  api: 'API',
  plugin: 'Plugin',
  cli: 'CLI',
}

export function ComparisonTable({ tools }: { tools: ComparedTool[] }) {
  const colCount = tools.length

  // Collect all unique features and integrations across tools
  const allFeatures = [
    ...new Set(tools.flatMap((t) => t.features ?? [])),
  ]
  const allIntegrations = [
    ...new Set(tools.flatMap((t) => t.integrations ?? [])),
  ]

  return (
    <div className="space-y-0">
      {/* ── Tool Headers ────────────────────────────────────── */}
      <div className={`grid grid-cols-${colCount} gap-4 mb-8`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="flex flex-col items-center text-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <ToolLogo
              tool={tool}
              size={64}
              className="flex items-center justify-center rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 mb-3"
              fallbackClassName="text-2xl font-bold text-zinc-500"
            />
            <Link
              href={`/tools/${tool.slug}`}
              className="text-lg font-semibold text-white hover:text-emerald-400 transition-colors"
            >
              {tool.name}
            </Link>
            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
              {tool.tagline}
            </p>
            {tool.avg_rating > 0 && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-white font-medium">
                  {Number(tool.avg_rating).toFixed(1)}
                </span>
                <span className="text-zinc-600">({tool.review_count})</span>
              </div>
            )}
            <a
              href={tool.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              Visit Website
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>

      {/* ── Comparison Rows ─────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        {/* Pricing */}
        <CompareRow label="Pricing">
          {tools.map((tool) => (
            <span
              key={tool.id}
              className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-medium ${pricingColor(tool.pricing_type)}`}
            >
              {pricingLabel(tool.pricing_type)}
            </span>
          ))}
        </CompareRow>

        {/* Pricing Plans */}
        <CompareRow label="Plans">
          {tools.map((tool) => (
            <div key={tool.id} className="space-y-1">
              {tool.pricing_details && tool.pricing_details.length > 0 ? (
                tool.pricing_details.map((plan, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-zinc-300">{plan.name}</span>
                    <span className="text-emerald-400 ml-1">{plan.price}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>
          ))}
        </CompareRow>

        {/* Rating */}
        <CompareRow label="Rating">
          {tools.map((tool) => (
            <div key={tool.id}>
              {tool.avg_rating > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm text-white font-medium">
                    {Number(tool.avg_rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-600">
                    ({tool.review_count} reviews)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">No reviews yet</span>
              )}
            </div>
          ))}
        </CompareRow>

        {/* Popularity */}
        <CompareRow label="Popularity">
          {tools.map((tool) => (
            <span key={tool.id} className="text-sm text-zinc-300">
              {formatNumber(tool.view_count)} views
            </span>
          ))}
        </CompareRow>

        {/* Skill Level */}
        <CompareRow label="Skill Level">
          {tools.map((tool) => (
            <span key={tool.id} className="text-sm text-zinc-300">
              {skillLabels[tool.skill_level] ?? tool.skill_level}
            </span>
          ))}
        </CompareRow>

        {/* API */}
        <CompareRow label="API Available">
          {tools.map((tool) => (
            <span key={tool.id}>
              {tool.has_api ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <X className="h-4 w-4 text-zinc-600" />
              )}
            </span>
          ))}
        </CompareRow>

        {/* Platforms */}
        <CompareRow label="Platforms">
          {tools.map((tool) => (
            <div key={tool.id} className="flex flex-wrap gap-1">
              {tool.platforms && tool.platforms.length > 0 ? (
                tool.platforms.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                  >
                    {platformLabels[p] ?? p}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>
          ))}
        </CompareRow>

        {/* Categories */}
        <CompareRow label="Categories">
          {tools.map((tool) => {
            const cats = tool.tool_categories
              ?.map((tc) => tc.categories)
              .filter(Boolean) ?? []
            return (
              <div key={tool.id} className="flex flex-wrap gap-1">
                {cats.length > 0 ? (
                  cats.map((c, i) => (
                    <span
                      key={i}
                      className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                    >
                      {c.icon} {c.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
            )
          })}
        </CompareRow>

        {/* Features matrix */}
        {allFeatures.length > 0 && (
          <>
            <div className="bg-zinc-800/50 px-4 py-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Features
              </span>
            </div>
            {allFeatures.map((feature) => (
              <CompareRow key={feature} label={feature} labelSmall>
                {tools.map((tool) => (
                  <span key={tool.id}>
                    {(tool.features ?? []).includes(feature) ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-700" />
                    )}
                  </span>
                ))}
              </CompareRow>
            ))}
          </>
        )}

        {/* Integrations matrix */}
        {allIntegrations.length > 0 && (
          <>
            <div className="bg-zinc-800/50 px-4 py-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Integrations
              </span>
            </div>
            {allIntegrations.map((integration) => (
              <CompareRow key={integration} label={integration} labelSmall>
                {tools.map((tool) => (
                  <span key={tool.id}>
                    {(tool.integrations ?? []).includes(integration) ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-700" />
                    )}
                  </span>
                ))}
              </CompareRow>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function CompareRow({
  label,
  labelSmall,
  children,
}: {
  label: string
  labelSmall?: boolean
  children: React.ReactNode[]
}) {
  const count = children.length
  return (
    <div className="grid border-b border-zinc-800 last:border-b-0" style={{ gridTemplateColumns: `180px repeat(${count}, minmax(0, 1fr))` }}>
      <div className="flex items-center px-4 py-3 bg-zinc-900/80">
        <span
          className={`${
            labelSmall ? 'text-xs text-zinc-500' : 'text-sm font-medium text-zinc-400'
          }`}
        >
          {label}
        </span>
      </div>
      {children.map((child, i) => (
        <div
          key={i}
          className="flex items-center px-4 py-3 border-l border-zinc-800"
        >
          {child}
        </div>
      ))}
    </div>
  )
}

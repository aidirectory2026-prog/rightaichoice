import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStackBySlug } from '@/lib/data/stacks'

const geistRegular = readFile(
  join(process.cwd(), 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')
)

type StackData = {
  title: string
  goal: string
  tools: string[]
  costSummary: string | null
}

async function getSavedStack(id: string): Promise<StackData | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('saved_stacks')
    .select('title, goal, stages, summary')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!data) return null

  const stages = Array.isArray(data.stages) ? data.stages : []
  const tools = stages
    .map((s: { bestPick?: { name?: string } }) => s.bestPick?.name)
    .filter(Boolean) as string[]

  const summary = data.summary as { paidPath?: string } | null

  return {
    title: data.title,
    goal: data.goal,
    tools,
    costSummary: summary?.paidPath ?? null,
  }
}

function getCuratedStack(slug: string): StackData | null {
  const stack = getStackBySlug(slug)
  if (!stack) return null

  return {
    title: stack.title,
    goal: stack.goal,
    tools: stack.stages.map((s) => s.bestPick.name),
    costSummary: stack.summary.paidPath,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  const slug = searchParams.get('slug')

  let stack: StackData | null = null

  if (type === 'saved' && id) {
    stack = await getSavedStack(id)
  } else if (type === 'curated' && slug) {
    stack = getCuratedStack(slug)
  }

  const fontData = await geistRegular

  const title = stack?.title ?? 'Build Anything with AI'
  const goal = stack?.goal ?? 'Discover the right AI tools for your workflow'
  const tools = stack?.tools ?? []
  const costSummary = stack?.costSummary ?? null

  const maxPills = 6
  const displayTools = tools.slice(0, maxPills)
  const extraCount = tools.length - maxPills

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          padding: '48px 56px',
          fontFamily: 'Geist',
        }}
      >
        {/* Top — Branding */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 22,
              color: '#34d399',
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            RightAIChoice
          </div>
        </div>

        {/* Center — Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 44,
              color: '#ffffff',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: 900,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title.length > 70 ? title.slice(0, 67) + '...' : title}
          </div>

          {displayTools.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 10,
                marginTop: 8,
              }}
            >
              {displayTools.map((tool) => (
                <div
                  key={tool}
                  style={{
                    backgroundColor: '#27272a',
                    color: '#e4e4e7',
                    fontSize: 18,
                    padding: '8px 18px',
                    borderRadius: 10,
                    border: '1px solid #3f3f46',
                  }}
                >
                  {tool}
                </div>
              ))}
              {extraCount > 0 && (
                <div
                  style={{
                    backgroundColor: '#18181b',
                    color: '#71717a',
                    fontSize: 18,
                    padding: '8px 18px',
                    borderRadius: 10,
                    border: '1px solid #3f3f46',
                  }}
                >
                  +{extraCount} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom — Stats + Watermark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', gap: 16, color: '#a1a1aa', fontSize: 16 }}>
            {tools.length > 0 && (
              <span>{tools.length} tools</span>
            )}
            {costSummary && (
              <span>· {costSummary}</span>
            )}
          </div>
          <div style={{ color: '#52525b', fontSize: 15 }}>
            rightaichoice.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Geist',
          data: fontData,
          style: 'normal',
          weight: 400,
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  )
}

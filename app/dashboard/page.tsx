import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  MessageSquare,
  MessageCircle,
  Bookmark,
  Award,
  Settings,
  ExternalLink,
  Calendar,
  Globe,
  Layers,
  Sparkles,
  Trash2,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { BadgeList } from '@/components/profile/badge-list'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import {
  getProfile,
  getUserBadges,
  getUserSavedTools,
  getUserReviews,
  getReputationHistory,
} from '@/lib/data/profiles'
import { ApiKeysPanel } from '@/components/dashboard/api-keys-panel'
import { DeleteStackButton } from '@/components/stacks/delete-stack-button'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profile, badges, savedTools, reviews, repHistory, apiKeysRes, savedStacksRes] = await Promise.all([
    getProfile(user.id),
    getUserBadges(user.id),
    getUserSavedTools(user.id),
    getUserReviews(user.id),
    getReputationHistory(user.id, 10),
    supabase
      .from('api_keys')
      .select('id, name, key_prefix, requests_total, last_used_at, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_stacks')
      .select('id, title, goal, source, view_count, created_at, stages')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const savedStacks = (savedStacksRes.data ?? []) as { id: string; title: string; goal: string; source: string; view_count: number; created_at: string; stages: unknown[] }[]

  if (!profile) redirect('/login')

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-zinc-500">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-sm text-zinc-500">@{profile.username}</p>
                {profile.is_admin && (
                  <span className="inline-block mt-1 text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 rounded px-2 py-0.5">
                    Admin
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/u/${profile.username}`}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Public Profile
              </Link>
              {profile.is_admin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:border-red-800 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          {/* Stats + Badges */}
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-6">
              <Stat icon={<Award className="h-4 w-4 text-emerald-400" />} label="Reputation" value={profile.reputation} />
              <Stat icon={<Star className="h-4 w-4 text-amber-400" />} label="Reviews" value={profile.review_count} />
              <Stat icon={<MessageSquare className="h-4 w-4 text-blue-400" />} label="Questions" value={profile.question_count} />
              <Stat icon={<MessageCircle className="h-4 w-4 text-purple-400" />} label="Answers" value={profile.answer_count} />
            </div>
            {badges.length > 0 && (
              <div className="border-l border-zinc-800 pl-6">
                <BadgeList badges={badges} />
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Saved Tools */}
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-emerald-400" />
                  Saved Tools ({savedTools.length})
                </h2>
                {savedTools.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedTools.map((tool) => {
                      const t = tool as { id: string; name: string; slug: string; tagline: string; logo_url: string | null; pricing_type: string; avg_rating: number; review_count: number }
                      return <ToolCard key={t.id} tool={t} />
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <Bookmark className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No saved tools yet.</p>
                    <Link
                      href="/tools"
                      className="mt-3 inline-flex text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Browse tools
                    </Link>
                  </div>
                )}
              </section>

              {/* Saved Stacks */}
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  Saved Stacks ({savedStacks.length})
                </h2>
                {savedStacks.length > 0 ? (
                  <div className="space-y-3">
                    {savedStacks.map((stack) => (
                      <div
                        key={stack.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/stacks/saved/${stack.id}`}
                              className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                            >
                              {stack.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-zinc-500 truncate">
                              {stack.goal}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                              <span className="flex items-center gap-1">
                                {stack.source === 'planner' ? (
                                  <Sparkles className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Layers className="h-3 w-3 text-amber-500" />
                                )}
                                {stack.source === 'planner' ? 'AI Generated' : 'Curated'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {stack.view_count}
                              </span>
                              <span>
                                {Array.isArray(stack.stages) ? stack.stages.length : 0} stages
                              </span>
                              <span>
                                {new Date(stack.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <DeleteStackButton id={stack.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <Layers className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No saved stacks yet.</p>
                    <Link
                      href="/plan"
                      className="mt-3 inline-flex text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Plan your AI stack
                    </Link>
                  </div>
                )}
              </section>

              {/* Recent Reviews */}
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  Your Reviews ({reviews.length})
                </h2>
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.slice(0, 5).map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/tools/${(review.tools as unknown as { slug: string })?.slug ?? ''}`}
                            className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                          >
                            {(review.tools as unknown as { name: string })?.name ?? 'Unknown Tool'}
                          </Link>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-1.5 text-sm text-zinc-500 line-clamp-1">
                          {review.use_case}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <Star className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No reviews yet. Share your experience with AI tools!</p>
                  </div>
                )}
              </section>

              {/* Reputation History */}
              {repHistory.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-400" />
                    Reputation History
                  </h2>
                  <div className="space-y-2">
                    {repHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-mono font-medium ${
                              entry.delta > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {entry.delta > 0 ? '+' : ''}
                            {entry.delta}
                          </span>
                          <span className="text-sm text-zinc-400">{entry.reason}</span>
                        </div>
                        <span className="text-xs text-zinc-600">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar (1/3) */}
            <aside className="space-y-6">
              {/* Edit Profile */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Edit Profile</h3>
                <EditProfileForm
                  profile={{
                    full_name: profile.full_name,
                    bio: profile.bio,
                    website_url: profile.website_url,
                  }}
                />
              </div>

              {/* Account Info */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Account</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Email</dt>
                    <dd className="text-zinc-300">{user.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Username</dt>
                    <dd className="text-zinc-300">@{profile.username}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Joined</dt>
                    <dd className="text-zinc-300">
                      {new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* API Keys */}
              <ApiKeysPanel initialKeys={apiKeysRes.data ?? []} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-semibold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

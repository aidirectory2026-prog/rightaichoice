import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  MessageSquare,
  MessageCircle,
  ArrowUp,
  Calendar,
  Globe,
  CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { BadgeList } from '@/components/profile/badge-list'
import {
  getProfileByUsername,
  getUserBadges,
  getUserReviews,
  getUserQuestions,
  getUserAnswers,
} from '@/lib/data/profiles'
import { timeAgo } from '@/lib/utils'

type PageProps = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return { title: 'User Not Found' }

  return {
    title: `${profile.full_name || profile.username} — RightAIChoice`,
    description: profile.bio || `Community profile for ${profile.username}`,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const [badges, reviews, questions, answers] = await Promise.all([
    getUserBadges(profile.id),
    getUserReviews(profile.id),
    getUserQuestions(profile.id),
    getUserAnswers(profile.id),
  ])

  const totalContributions = reviews.length + questions.length + answers.length

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-zinc-500">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {profile.full_name || profile.username}
              </h1>
              <p className="text-sm text-zinc-500">@{profile.username}</p>

              {profile.bio && (
                <p className="mt-2 text-sm text-zinc-400 max-w-lg">{profile.bio}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="mt-3">
                  <BadgeList badges={badges} />
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Reputation" value={profile.reputation} />
            <StatCard label="Reviews" value={profile.review_count} />
            <StatCard label="Questions" value={profile.question_count} />
            <StatCard label="Answers" value={profile.answer_count} />
          </div>

          {/* Contributions */}
          <div className="mt-10 space-y-8">
            {/* Reviews */}
            {reviews.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-3">
                  {reviews.map((review) => (
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
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {review.pros && (
                          <p className="text-zinc-400">
                            <span className="text-emerald-500 font-medium">Pros:</span> {review.pros}
                          </p>
                        )}
                        {review.cons && (
                          <p className="text-zinc-400">
                            <span className="text-red-400 font-medium">Cons:</span> {review.cons}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          {review.upvotes}
                        </span>
                        <span>{timeAgo(review.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Questions */}
            {questions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  Questions ({questions.length})
                </h2>
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{q.title}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-600">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {q.answer_count} answers
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {q.upvotes}
                          </span>
                          {q.is_answered && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Answered
                            </span>
                          )}
                          <span>{timeAgo(q.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Answers */}
            {answers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  Answers ({answers.length})
                </h2>
                <div className="space-y-3">
                  {answers.map((a) => {
                    const question = a.questions as unknown as { id: string; title: string; tools?: { name: string; slug: string } } | null
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        {question && (
                          <p className="text-xs text-zinc-600 mb-1">
                            Re: {question.title}
                          </p>
                        )}
                        <p className="text-sm text-zinc-400 line-clamp-2">{a.body}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                          <span className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {a.upvotes}
                          </span>
                          {a.is_accepted && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Accepted
                            </span>
                          )}
                          <span>{timeAgo(a.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {totalContributions === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-zinc-500">
                  No contributions yet. This user hasn&apos;t written any reviews, questions, or answers.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

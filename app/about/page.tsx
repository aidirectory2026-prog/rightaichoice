import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Zap, Users, Brain, Shield } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About — RightAIChoice',
  description: 'RightAIChoice is the decision-making engine for discovering and choosing AI tools. Built for the AI community.',
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

          {/* Hero */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white mb-4">About RightAIChoice</h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              RightAIChoice is a decision-making engine for the AI ecosystem — not just a directory.
              We built it because choosing the right AI tool is genuinely hard, and most directories
              give you a list with no real signal.
            </p>
          </div>

          {/* The Problem */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">The Problem We&apos;re Solving</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              There are thousands of AI tools. New ones ship every day. Marketing copy is everywhere
              and genuinely useful signal is hard to find. Most discovery platforms are either static
              lists or paid placements dressed up as recommendations.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              The result: people pick tools based on hype, get burned, and waste time.
              We think that&apos;s a solvable problem.
            </p>
          </section>

          {/* How We&apos;re Different */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-6">How We&apos;re Different</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Brain className="h-5 w-5 text-emerald-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">3-Layer Intelligence</h3>
                <p className="text-sm text-zinc-500">
                  Structured discovery, community intelligence, and AI-powered recommendations working together
                  — not three separate products.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Users className="h-5 w-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Real Community Signal</h3>
                <p className="text-sm text-zinc-500">
                  Reviews, Q&amp;A, and discussions from people who actually use these tools — ranked by
                  credibility, not recency.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Zap className="h-5 w-5 text-amber-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Intent-First Search</h3>
                <p className="text-sm text-zinc-500">
                  Describe what you want to do — not what you think the tool is called.
                  Our AI maps your intent to the right tools.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Shield className="h-5 w-5 text-purple-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Transparent Monetization</h3>
                <p className="text-sm text-zinc-500">
                  Sponsored placements are clearly labeled. Our ranking is not for sale.
                  We make that guarantee explicit, not buried.
                </p>
              </div>
            </div>
          </section>

          {/* What We&apos;re Building */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">What We&apos;re Building</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              RightAIChoice is the intelligence layer for the AI ecosystem. The goal: when someone needs
              an AI tool, they come here first and leave with enough signal to decide confidently —
              not just a list of links.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              We&apos;re a small, focused team building this in public. Every feature is driven by
              real user problems — not feature requests, competitor copying, or trend-chasing.
            </p>
          </section>

          {/* CTA */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Want to contribute?</p>
              <p className="text-sm text-zinc-500 mt-0.5">
                Write a review, answer a question, or share a workflow. Every contribution improves the platform for everyone.
              </p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Join the community
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}

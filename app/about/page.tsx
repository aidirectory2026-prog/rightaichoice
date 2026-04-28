import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Zap, Users, Brain, Shield, BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About',
  description: 'RightAIChoice is the decision-making engine for the AI ecosystem. 500+ verified tools, community intelligence, and AI-powered recommendations.',
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
            <p className="text-lg text-zinc-400 leading-relaxed mb-4">
              RightAIChoice is the decision-making engine for the AI ecosystem. We exist to solve one
              problem: finding the right AI tool for any job should take minutes, not hours of research
              across scattered blog posts, biased listicles, and paid directories.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              We combine structured data, real community intelligence, and AI-powered analysis into a
              single platform where every signal serves the user&apos;s decision — not the tool vendor&apos;s
              marketing budget.
            </p>
          </div>

          {/* Mission */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Our Mission</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              The AI tools market is growing faster than anyone can track. Thousands of tools exist,
              new ones launch daily, and the gap between marketing claims and actual capability is often
              enormous. Most discovery platforms compound this problem — they&apos;re either static lists
              with no editorial integrity, or pay-to-play directories where rankings follow revenue,
              not relevance.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              RightAIChoice was built to be the antidote: a platform where the quality of information
              improves with every user interaction, where editorial verdicts are independent and honest,
              and where AI amplifies community knowledge rather than replacing it. Our commitment is to
              high-signal, trustworthy discovery — no SEO spam, no fake engagement, no sponsored
              results disguised as organic rankings.
            </p>
          </section>

          {/* Data Methodology */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Our Data Methodology</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">500+ Verified AI Tools</h3>
                    <p className="text-sm text-zinc-500">
                      Every tool in our directory undergoes a structured verification process. We analyze the
                      tool&apos;s website, documentation, pricing pages, and public APIs to build accurate,
                      comprehensive profiles — not copied marketing copy.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Automated Data Freshness</h3>
                    <p className="text-sm text-zinc-500">
                      Tool data is refreshed on a rolling 3-day cycle. New AI tools are discovered and added
                      daily from multiple sources. FAQs are updated every 48 hours based on real user pain points
                      from Reddit, ProductHunt, G2, and other community sources. Stale data is the enemy of
                      good decisions — we eliminate it systematically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How We&apos;re Different */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-6">How We&apos;re Different</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Brain className="h-5 w-5 text-emerald-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">3-Layer Intelligence</h3>
                <p className="text-sm text-zinc-500">
                  Structured discovery (search, filter, browse), community intelligence (reviews, Q&amp;A,
                  discussions), and AI-powered analysis (recommendations, workflow generation, natural
                  language search) — three layers working as one integrated system.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Users className="h-5 w-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Community-Driven Signal</h3>
                <p className="text-sm text-zinc-500">
                  Reviews from practitioners who actually use these tools. Questions answered by the community.
                  Discussions with real technical depth. Every contribution is ranked by credibility and
                  usefulness, not just recency.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Zap className="h-5 w-5 text-amber-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Intent-First Search</h3>
                <p className="text-sm text-zinc-500">
                  Describe what you want to accomplish, not what you think the tool is called. Our AI
                  understands context — budget, skill level, existing tech stack — and maps your intent
                  to the right tools with clear reasoning.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Shield className="h-5 w-5 text-purple-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5">Transparent Monetization</h3>
                <p className="text-sm text-zinc-500">
                  Sponsored placements carry a visible &ldquo;Sponsored&rdquo; badge. Affiliate links are
                  disclosed. Our ranking algorithm is not influenced by commercial relationships. This
                  commitment is non-negotiable and foundational to the trust our users place in us.
                </p>
              </div>
            </div>
          </section>

          {/* Editorial Standards */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Editorial Standards</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Every tool page includes an independent editorial verdict — our honest assessment of who
              should (and shouldn&apos;t) use a given tool. These verdicts are generated through a combination
              of automated analysis and editorial review, and are never influenced by tool vendors,
              advertisers, or affiliate relationships.
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm text-zinc-400 leading-relaxed">
              <li><strong className="text-zinc-300">Best For / Not For</strong> — Clear guidance on ideal and non-ideal use cases.</li>
              <li><strong className="text-zinc-300">Our Views</strong> — Long-form editorial analysis with specific, substantive critique.</li>
              <li><strong className="text-zinc-300">AI Panel</strong> — On-demand AI analysis that synthesizes community reviews, features, and competitive positioning.</li>
              <li><strong className="text-zinc-300">FAQs</strong> — Auto-generated from real user pain points surfaced across Reddit, G2, ProductHunt, and community forums.</li>
            </ul>
          </section>

          {/* Community Model */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Community Model</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Our community layer is designed to surface expertise, not noise. Contributors earn reputation
              through the quality of their contributions — reviews that help others decide, answers that solve
              real problems, workflows that save people time. The reputation system rewards depth over volume
              and genuine expertise over first-mover advantage.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              We believe the best product decisions come from combining structured data, community wisdom, and
              AI analysis — each layer strengthening the others. The more people contribute, the better the
              platform gets for everyone. That&apos;s the flywheel we&apos;re building.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>General inquiries: <span className="text-zinc-300">hello@rightaichoice.com</span></p>
              <p>Privacy concerns: <span className="text-zinc-300">privacy@rightaichoice.com</span></p>
              <p>Security reports: <span className="text-zinc-300">security@rightaichoice.com</span></p>
              <p>Legal matters: <span className="text-zinc-300">legal@rightaichoice.com</span></p>
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Join the community</p>
              <p className="text-sm text-zinc-500 mt-0.5">
                Write a review, answer a question, or share a workflow. Every contribution strengthens
                the platform for the entire AI community.
              </p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Get started
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}

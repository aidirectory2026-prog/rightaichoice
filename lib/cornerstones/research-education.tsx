import type { Cornerstone } from './types'

/**
 * /categories/research-education — AI for Research & Learning cornerstone.
 *
 * This category slug merges two related-but-distinct audiences (research/
 * search and study/learning), so the cornerstone is framed around both and
 * splits its picks into the two lanes. Picks curated by editorial judgment.
 */
export const researchEducationCornerstone: Cornerstone = {
  metaTitle: 'Best AI Research & Learning Tools 2026 | RightAIChoice',
  metaDescription:
    'The 2026 guide to AI for research and learning — answer engines, literature-review tools, and study platforms. Picks for students, academics, and the curious.',
  h1: 'The Best AI Research & Learning Tools in 2026',
  subtitle:
    'Answer engines, literature-review assistants, and study platforms — split by whether you are finding answers or learning a subject.',
  lastReviewed: 'May 30, 2026',
  lastReviewedISO: '2026-05-30',
  publishedISO: '2026-05-30',

  picks: [
    {
      slug: 'perplexity',
      name: 'Perplexity',
      bestFor: 'Best AI answer engine',
      reason:
        'The default for "answer my question with sources." Live web, citations on every claim, and follow-ups that keep context. Start here.',
    },
    {
      slug: 'notebooklm',
      name: 'NotebookLM',
      bestFor: 'Best for your own sources',
      reason:
        'Upload your PDFs, notes, and papers; it answers only from them — grounded, citeable, no hallucinated outside facts. Plus audio overviews.',
    },
    {
      slug: 'consensus',
      name: 'Consensus',
      bestFor: 'Best for scientific evidence',
      reason:
        'Searches peer-reviewed literature and summarizes what the studies actually found — built for evidence, not vibes.',
    },
    {
      slug: 'elicit',
      name: 'Elicit',
      bestFor: 'Best for literature reviews',
      reason:
        'Automates the systematic-review workflow: find papers, extract methods and findings into a table, and screen at scale.',
    },
    {
      slug: 'coursera',
      name: 'Coursera',
      bestFor: 'Best for structured courses',
      reason:
        'The broadest catalog of university and industry courses, now with an AI Coach that tutors you through the material.',
    },
    {
      slug: 'duolingo',
      name: 'Duolingo',
      bestFor: 'Best for language learning',
      reason:
        'The habit-forming language app, with AI-powered conversation practice (Duolingo Max) that finally makes speaking practice viable.',
    },
  ],

  topCompares: [
    {
      slug: 'notebooklm-vs-perplexity',
      label: 'NotebookLM vs Perplexity',
      blurb: 'Answer from your sources vs answer from the live web.',
    },
    {
      slug: 'consensus-vs-perplexity',
      label: 'Consensus vs Perplexity',
      blurb: 'Peer-reviewed evidence vs general web answers.',
    },
    {
      slug: 'elicit-vs-semantic-scholar',
      label: 'Elicit vs Semantic Scholar',
      blurb: 'Automated lit-review workflow vs the academic search index.',
    },
    {
      slug: 'kagi-vs-perplexity',
      label: 'Kagi vs Perplexity',
      blurb: 'Private paid search vs the AI answer engine.',
    },
    {
      slug: 'coursera-vs-khan-academy',
      label: 'Coursera vs Khan Academy',
      blurb: 'Credentialed courses vs free foundational learning.',
    },
    {
      slug: 'duolingo-vs-talkpal',
      label: 'Duolingo vs TalkPal',
      blurb: 'Gamified habit app vs AI conversation-first practice.',
    },
  ],

  body: (
    <div className="space-y-4 text-zinc-300 leading-relaxed">
      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        How we picked these tools
      </h2>
      <p>
        &quot;AI for research and learning&quot; covers two jobs that look
        similar but need different tools:{' '}
        <strong className="font-semibold text-white">finding a trustworthy
        answer</strong>{' '}
        and{' '}
        <strong className="font-semibold text-white">actually learning a
        subject</strong>. A general chatbot can fake both and is dangerous at
        each — it will confidently invent a citation or a fact. So we only kept
        tools that ground their output in real sources (for research) or build
        durable understanding through structure and practice (for learning).
      </p>
      <p>
        The six picks split across those two lanes. Each has a head-to-head
        compare to drill into, and the full list of every tool in this category
        sits below.
      </p>

      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        Lane 1 — Research &amp; search
      </h2>
      <p>
        The shift here is from &quot;ten blue links&quot; to{' '}
        <strong className="font-semibold text-white">a cited answer</strong>.
        The right tool depends on where your sources live:
      </p>
      <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
        <li>
          General questions, live web →{' '}
          <strong className="font-semibold text-white">Perplexity</strong>{' '}
          (or <strong className="font-semibold text-white">Kagi</strong> if you
          want private, ad-free paid search).
        </li>
        <li>
          Answers grounded only in <em>your</em> documents →{' '}
          <strong className="font-semibold text-white">NotebookLM</strong>.
        </li>
        <li>
          Scientific / peer-reviewed evidence →{' '}
          <strong className="font-semibold text-white">Consensus</strong>.
        </li>
        <li>
          Systematic literature reviews at scale →{' '}
          <strong className="font-semibold text-white">Elicit</strong>.
        </li>
      </ul>
      <p>
        The one rule that matters across all of them:{' '}
        <strong className="font-semibold text-white">check the
        citation</strong>. The grounded tools (NotebookLM, Consensus, Elicit)
        make this easy; a general chatbot does not, which is exactly why
        it&apos;s the wrong tool for research you&apos;ll rely on.
      </p>

      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        Lane 2 — Learning &amp; study
      </h2>
      <p>
        Finding an answer isn&apos;t the same as learning. For building real
        understanding, the winners pair content with{' '}
        <strong className="font-semibold text-white">structure, feedback, and
        practice</strong>:
      </p>
      <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
        <li>
          Structured, credentialed courses with an AI tutor →{' '}
          <strong className="font-semibold text-white">Coursera</strong> (Khan
          Academy for free foundational material).
        </li>
        <li>
          Language learning with conversation practice →{' '}
          <strong className="font-semibold text-white">Duolingo</strong> (or
          conversation-first apps like TalkPal and Speak).
        </li>
        <li>
          Turning your own notes into study material → bring them into{' '}
          <strong className="font-semibold text-white">NotebookLM</strong> and
          generate summaries, quizzes, and audio reviews.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        What changed in 2026
      </h2>
      <p>
        Two things. First, answer engines became{' '}
        <strong className="font-semibold text-white">good enough to replace
        the first page of Google</strong>{' '}
        for research questions — the open question is now sourcing quality, not
        capability, which is why the grounded and academic tools matter more
        than ever. Second, learning apps moved from passive content to{' '}
        <strong className="font-semibold text-white">active AI tutoring</strong>{' '}
        — Coursera Coach, Duolingo Max, Khanmigo — that can explain, quiz, and
        adapt. The result: the line between &quot;look it up&quot; and
        &quot;learn it&quot; is blurring, but the best tool still depends which
        you actually need.
      </p>

      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        Pricing in plain English
      </h2>
      <p>
        Research tools cluster around{' '}
        <strong className="font-semibold text-white">$0–$20/month</strong>:
        Perplexity, NotebookLM, and Consensus all have usable free tiers, with
        Pro plans (~$20) unlocking better models and higher limits. Elicit and
        academic tools run higher for heavy research use. Learning platforms
        vary widely — Khan Academy is free, Duolingo is free with a ~$13/mo
        Super tier, and Coursera ranges from free audits to ~$59/mo for a Plus
        subscription with certificates.
      </p>

      <h2 className="mt-10 mb-3 text-2xl font-semibold text-white">
        What we don&apos;t cover here
      </h2>
      <p>
        General-purpose chat assistants (ChatGPT, Claude, Gemini) live on their
        own pages — they overlap with research but aren&apos;t grounded by
        default. Writing and citation tools (QuillBot, Paperpal) are covered
        under writing. Head to those category pages directly.
      </p>
    </div>
  ),

  faqs: [
    {
      question: 'What is the best AI tool for research in 2026?',
      answer:
        'For general research with cited answers, Perplexity is the default. For answers grounded only in your own documents, use NotebookLM. For peer-reviewed scientific evidence, Consensus; for systematic literature reviews, Elicit. The key rule across all of them is to verify the citation — which the grounded tools make easy and a general chatbot does not.',
    },
    {
      question: 'Is Perplexity or ChatGPT better for research?',
      answer:
        'Perplexity is purpose-built for research: it searches the live web and cites a source for each claim, so you can verify. ChatGPT is a stronger general reasoner but does not cite by default and is more likely to invent a fact or reference. For anything you will rely on, prefer Perplexity (or a grounded tool like NotebookLM/Consensus) and always check the source.',
    },
    {
      question: 'What is the best AI tool for students?',
      answer:
        'It depends on the task. NotebookLM turns your own lecture notes and readings into summaries, quizzes, and audio reviews. Consensus and Elicit help with research papers. Coursera (with its AI Coach) and Khan Academy (Khanmigo) tutor you through structured material. For language study, Duolingo. Avoid using a general chatbot as a source — it does not cite reliably.',
    },
    {
      question: 'What is the best AI tool for academic literature reviews?',
      answer:
        'Elicit is purpose-built for systematic reviews — it finds papers and extracts methods and findings into a structured table. Consensus is better for quick "what does the evidence say" questions across peer-reviewed work. Semantic Scholar is the underlying academic search index. See the Elicit vs Semantic Scholar and Consensus vs Perplexity compares above.',
    },
    {
      question: 'Are AI research tools accurate? Can I trust the citations?',
      answer:
        'Grounded tools (NotebookLM, Consensus, Elicit) are far more reliable than general chatbots because they cite real, retrievable sources you can open and check. They are not infallible — a citation can be misread or taken out of context — so the discipline is the same as always: open the source and confirm it says what the tool claims.',
    },
    {
      question: 'What is the best AI tool for learning a language?',
      answer:
        'Duolingo is the best habit-forming all-rounder, and its Max tier adds AI conversation practice. If your priority is speaking from day one, conversation-first apps like TalkPal and Speak are stronger. See the Duolingo vs TalkPal and Duolingo vs Speak compares above.',
    },
    {
      question: 'Is Coursera or Khan Academy better?',
      answer:
        'Khan Academy is free and excellent for foundational K-12 and early-college material, with the Khanmigo AI tutor. Coursera has a far broader catalog of university and professional courses, certificates, and degrees, with its own AI Coach. Choose Khan Academy to learn fundamentals for free; choose Coursera for credentials and advanced/professional topics.',
    },
  ],
}

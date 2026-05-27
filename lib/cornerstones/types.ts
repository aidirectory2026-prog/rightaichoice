/**
 * Phase 9 — Cornerstone editorial pages.
 *
 * A cornerstone is a hand-written, 1,500+ word editorial layer that
 * sits ABOVE the generic templated listing on /categories/[slug]. The
 * goal: concentrate topical authority on the category URL so it can
 * rank for the broad short-tail query (e.g. "best ai coding tools")
 * and act as the hub that links out to every tool + compare in the
 * cluster.
 *
 * Cornerstones are registered in `./registry.ts` keyed by category
 * slug. Categories without a cornerstone fall back to the default
 * generic header — no change.
 */

import type { ReactNode } from 'react'

export type CornerstoneFaq = {
  question: string
  answer: string
}

export type CornerstonePick = {
  /** Internal /tools/<slug> link target */
  slug: string
  /** Display name (anchor text) */
  name: string
  /** One-sentence reason this tool wins this sub-category */
  reason: string
  /** The "best for X" label (e.g. "Best for autonomous PR shipping") */
  bestFor: string
}

export type CornerstoneCompare = {
  /** Internal /compare/<slug> link target */
  slug: string
  /** Display label (anchor text — literal "A vs B" preferred) */
  label: string
  /** Why this matchup matters in one short sentence */
  blurb: string
}

export type Cornerstone = {
  /** SEO <title> override (50–60 chars, ends with " | RightAIChoice") */
  metaTitle: string
  /** Meta description (150–160 chars, includes primary keyword) */
  metaDescription: string
  /** Primary <h1>. Differs from metaTitle: longer, no brand suffix. */
  h1: string
  /** One-line subtitle under the h1 */
  subtitle: string
  /** Display string for "Last reviewed" byline — keep in sync with edits */
  lastReviewed: string
  /** ISO date for Article schema dateModified */
  lastReviewedISO: string
  /** ISO date for Article schema datePublished */
  publishedISO: string
  /** 3-6 curated "best for X" picks rendered as a grid */
  picks: CornerstonePick[]
  /** Top head-to-head compares — link bait + crawl distribution */
  topCompares: CornerstoneCompare[]
  /** Long-form prose (TSX). 800-1,200 words. Renders below the picks. */
  body: ReactNode
  /** FAQ entries — emitted as FAQPage JSON-LD and rendered as accordion */
  faqs: CornerstoneFaq[]
}

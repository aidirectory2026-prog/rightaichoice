/**
 * Funnel + Goal definitions. Free tier blocks programmatic creation, so
 * this file is the source-of-truth for manual setup via the UI playbook.
 * Each funnel's Goal threshold is pulled from the monthly targets in
 * docs/marketing/tracking-mechanisms-and-goals.md.
 */

export type FunnelStep = {
  event: string
  /** Optional property filter applied at the step. */
  filter?: string
}

export type FunnelDef = {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
  /** Max time from step 1 to last step. */
  conversionWindow: '1 hour' | '1 day' | '7 days' | '14 days' | '30 days'
  /** Breakdown dimension recommended when reading the funnel. */
  breakdown?: string
  /** Goal: conversion rate target per month (Jun..Sep 2026). */
  goal: {
    metric: 'conversion_rate' | 'volume'
    label: string
    jun: number
    jul: number
    aug: number
    sep: number
    /** Alert threshold — fire a notification when we drop below X% of target. */
    alertBelow?: number
  }
}

export const FUNNELS: FunnelDef[] = [
  {
    id: 'discovery_tool_visit',
    name: 'Discovery — page → tool → visit',
    description: 'How well do visitors convert from landing into affiliate clicks.',
    steps: [
      { event: 'page_viewed' },
      { event: 'tool_page_viewed' },
      { event: 'tool_visit_clicked' },
    ],
    conversionWindow: '1 day',
    breakdown: 'first_touch_utm_source',
    goal: {
      metric: 'conversion_rate',
      label: 'tool page view → visit click',
      jun: 4,
      jul: 6,
      aug: 8,
      sep: 10,
      alertBelow: 75,
    },
  },
  {
    id: 'plan_wizard',
    name: 'Plan wizard',
    description: 'Step-by-step plan completion.',
    steps: [
      { event: 'plan_started' },
      { event: 'plan_step_completed', filter: 'step_index = 0' },
      { event: 'plan_step_completed', filter: 'step_index = 1' },
      { event: 'plan_step_completed', filter: 'step_index = 2' },
      { event: 'plan_completed' },
    ],
    conversionWindow: '1 day',
    breakdown: 'source',
    goal: {
      metric: 'conversion_rate',
      label: 'plan start → complete',
      jun: 25,
      jul: 35,
      aug: 45,
      sep: 55,
      alertBelow: 70,
    },
  },
  {
    id: 'compare_share',
    name: 'Compare → share',
    description: 'Does comparison drive viral share clicks?',
    steps: [
      { event: 'compare_tool_added' },
      { event: 'comparison_viewed' },
      { event: 'compare_share_clicked' },
    ],
    conversionWindow: '1 hour',
    goal: {
      metric: 'volume',
      label: 'compare_share_clicked per 100 comparisons',
      jun: 3,
      jul: 5,
      aug: 7,
      sep: 10,
    },
  },
  {
    id: 'signup_activation',
    name: 'Signup → activation',
    description: 'Fastest path from signup to a value milestone.',
    steps: [
      { event: 'signup_started' },
      { event: 'signup_completed' },
      { event: 'activation_milestone' },
    ],
    conversionWindow: '1 day',
    breakdown: 'method',
    goal: {
      metric: 'conversion_rate',
      label: 'signup complete → activation (24h)',
      jun: 20,
      jul: 30,
      aug: 40,
      sep: 50,
      alertBelow: 70,
    },
  },
  {
    id: 'workflow_usage',
    name: 'Workflow usage',
    description: 'Generation → save → share depth.',
    steps: [
      { event: 'workflow_generated' },
      { event: 'workflow_saved' },
      { event: 'workflow_shared' },
    ],
    conversionWindow: '7 days',
    goal: {
      metric: 'conversion_rate',
      label: 'generated → saved',
      jun: 30,
      jul: 40,
      aug: 45,
      sep: 50,
    },
  },
  {
    id: 'stack_export',
    name: 'Stack → export',
    description: 'Highest-intent stack signal.',
    steps: [
      { event: 'stack_viewed' },
      { event: 'stack_saved' },
      { event: 'stack_exported' },
    ],
    conversionWindow: '7 days',
    goal: {
      metric: 'conversion_rate',
      label: 'viewed → exported',
      jun: 1,
      jul: 2,
      aug: 2.5,
      sep: 3,
    },
  },
  {
    id: 'ai_chat_quality',
    name: 'AI chat — suggestion quality',
    description: 'Does the bot actually convert suggestions into clicks?',
    steps: [
      { event: 'ai_chat_message' },
      { event: 'ai_chat_tool_suggested' },
      { event: 'ai_chat_tool_clicked' },
    ],
    conversionWindow: '1 hour',
    goal: {
      metric: 'conversion_rate',
      label: 'suggested → clicked',
      jun: 15,
      jul: 22,
      aug: 26,
      sep: 30,
      alertBelow: 65,
    },
  },
  {
    id: 'newsletter_capture',
    name: 'Newsletter capture',
    description: 'Of page views, how many sign up?',
    steps: [
      { event: 'page_viewed' },
      { event: 'newsletter_subscribed' },
    ],
    conversionWindow: '1 hour',
    goal: {
      metric: 'volume',
      label: 'newsletter signups / month',
      jun: 40,
      jul: 100,
      aug: 250,
      sep: 500,
    },
  },
  {
    id: 'monetization',
    name: 'Pricing → upgrade',
    description: 'Pre-revenue conversion intent.',
    steps: [
      { event: 'pricing_viewed' },
      { event: 'upgrade_clicked' },
    ],
    conversionWindow: '1 hour',
    goal: {
      metric: 'conversion_rate',
      label: 'pricing_view → upgrade_click',
      jun: 0,
      jul: 0,
      aug: 3,
      sep: 6,
    },
  },
  {
    id: 'content_to_product',
    name: 'Content → product',
    description: 'Blog reader becoming tool browser.',
    steps: [
      { event: 'blog_post_viewed' },
      { event: 'blog_internal_link_clicked' },
      { event: 'tool_page_viewed' },
    ],
    conversionWindow: '1 day',
    goal: {
      metric: 'conversion_rate',
      label: 'blog → tool page view',
      jun: 8,
      jul: 12,
      aug: 15,
      sep: 18,
    },
  },
  {
    id: 'search_quality',
    name: 'Search quality',
    description: 'Search → click → deeper view.',
    steps: [
      { event: 'search_query_submitted' },
      { event: 'search_result_clicked' },
      { event: 'tool_page_viewed' },
    ],
    conversionWindow: '1 hour',
    breakdown: 'query',
    goal: {
      metric: 'conversion_rate',
      label: 'search → click',
      jun: 30,
      jul: 40,
      aug: 45,
      sep: 50,
    },
  },
  {
    id: 'new_user_activation',
    name: 'New user → activation (24h)',
    description: 'Top-level activation funnel. First session → milestone within 24h.',
    steps: [
      { event: 'page_viewed', filter: 'first_session = true' },
      { event: 'activation_milestone' },
    ],
    conversionWindow: '1 day',
    goal: {
      metric: 'conversion_rate',
      label: 'new visitor → activation (24h)',
      jun: 20,
      jul: 30,
      aug: 40,
      sep: 50,
      alertBelow: 70,
    },
  },
]

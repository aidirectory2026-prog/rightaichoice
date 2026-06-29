/**
 * BUG-39 (Phase 13) — single source of truth for viability tiers.
 *
 * The per-tool "Safe bet / Moderate / At risk" BADGE (shown on every card and
 * detail page) classified score ≥70 as a safe bet, but the /viability/safe-bets
 * LIST filtered ≥85 — so a tool scoring 75 showed a green "Safe bet" badge yet
 * was absent from the Safe-bet list. These constants make the badge and both
 * list pages agree. The badge is the canonical signal users see everywhere, so
 * its long-standing ≥70 boundary wins.
 */
export const VIABILITY_SAFE_BET = 70 // score ≥ this → "safe bet"
export const VIABILITY_AT_RISK = 40 // score < this → "at risk"; in-between → "moderate"

export type ViabilityTier = 'safe_bet' | 'moderate' | 'at_risk'

export function viabilityTier(score: number): ViabilityTier {
  if (score >= VIABILITY_SAFE_BET) return 'safe_bet'
  if (score >= VIABILITY_AT_RISK) return 'moderate'
  return 'at_risk'
}

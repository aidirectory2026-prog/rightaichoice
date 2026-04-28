/**
 * Single source of truth for the public-facing "how many tools" number.
 * Live count (2026-04-29): 1,189 published tools. "1,000+" is conservative
 * and stays accurate until the catalog crosses 2,000 — at which point flip
 * this to '2,000+' in one place rather than chasing hardcoded copies.
 *
 * Why a constant and not a live DB read: this string appears in client
 * components (PlanWaitingState) and metadata.description fields where an
 * async DB fetch is awkward or impossible. A single curated number we own
 * is more honest than mismatched numbers across pages.
 */
export const TOOL_COUNT_DISPLAY = '1,000+'

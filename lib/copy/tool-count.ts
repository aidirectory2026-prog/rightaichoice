/**
 * Single source of truth for the public-facing "how many tools" number.
 * Live count (2026-06-18): ~2,050 published tools. Rounded down to '2,000+'.
 * Flip again once the catalog crosses 2,500.
 *
 * Why a constant and not a live DB read: this string appears in client
 * components (PlanWaitingState) and metadata.description fields where an
 * async DB fetch is awkward or impossible. A single curated number we own
 * is more honest than mismatched numbers across pages.
 */
export const TOOL_COUNT_DISPLAY = '2,000+'

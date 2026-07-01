// Phase 14 — self-heal deploy version-skew.
//
// This repo deploys frequently (multiple sessions). When a new build ships, a
// browser tab still on the OLD build requests JS chunks that the new deployment
// no longer serves (the /_next/static/chunks/*.js?dpl=<old> URLs 404). The chunk
// fails to load, so the React component that needed it never renders/hydrates —
// and every interactive control on it (e.g. the admin filter buttons) silently
// stops responding until a manual hard-refresh. That is the real cause of
// "sometimes the filters just don't work — today none of them did, other days
// they're fine": the /admin error log shows repeated react_boundary "Load
// failed" + "Failed to load script: /_next/static/chunks/…js?dpl=…" on exactly
// the days it broke.
//
// Belt: enable Vercel Skew Protection (keeps a client's pinned deployment's
// assets available). Suspenders (this file): if a chunk still fails, reload the
// page ONCE to pull the current deployment's assets. Guarded via sessionStorage
// so a genuinely-missing asset can never cause an infinite reload loop.

const RELOAD_KEY = 'rac-chunk-reload-at'
const COOLDOWN_MS = 30_000

/** Heuristic: does this message / asset URL look like a deploy-skew chunk
 *  failure (as opposed to an ordinary runtime exception)? */
export function isChunkLoadError(input: string | null | undefined): boolean {
  const s = input || ''
  if (!s) return false
  return (
    /ChunkLoadError/i.test(s) ||
    /Loading chunk [\w-]+ failed/i.test(s) ||
    /Failed to load chunk/i.test(s) ||
    /Importing a module script failed/i.test(s) ||
    /error loading dynamically imported module/i.test(s) ||
    /Failed to fetch dynamically imported module/i.test(s) ||
    // Safari surfaces a failed chunk/network fetch as a bare "Load failed".
    /\bLoad failed\b/i.test(s) ||
    // A first-party Next static asset that 404'd after a deploy.
    /\/_next\/static\//.test(s)
  )
}

/**
 * Reload the page once to fetch the current deployment's assets. Returns true
 * if a reload was triggered, false if suppressed by the cooldown guard (so a
 * permanently-missing asset degrades to the normal error UI instead of looping).
 */
export function attemptChunkReload(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || '0')
    if (Date.now() - last < COOLDOWN_MS) return false
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage blocked (private mode): accept a single unguarded reload.
  }
  window.location.reload()
  return true
}

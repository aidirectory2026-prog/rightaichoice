// Phase 14b Wave 2 — minimal user-agent → browser/os extraction.
//
// ONE parse point for both the ingest hot path (app/api/track-mirror) and the
// historical backfill (scripts/backfill-browser-os.ts), so old and new rows are
// parsed by literally the same code. Deliberately tiny: family-level names only
// (no versions), pure regex, no dependency, fail-open to null. Order matters —
// Edge/Opera/Samsung carry "Chrome" in their UA, so they're tested first.

export function parseBrowser(ua: string | null | undefined): string | null {
  if (!ua) return null
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge'
  if (/OPR\/|Opera/.test(ua)) return 'opera'
  if (/SamsungBrowser\//.test(ua)) return 'samsung'
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox'
  if (/CriOS\//.test(ua)) return 'chrome' // Chrome on iOS
  if (/Chrome\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'safari'
  return null
}

export function parseOs(ua: string | null | undefined): string | null {
  if (!ua) return null
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows/.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macos'
  if (/CrOS/.test(ua)) return 'chromeos'
  if (/Linux/.test(ua)) return 'linux'
  return null
}

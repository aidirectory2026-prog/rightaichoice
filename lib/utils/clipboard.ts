/**
 * BUG-27f (Phase 13) — robust clipboard copy.
 *
 * `navigator.clipboard.writeText` REJECTS in an insecure context (http://,
 * some in-app webviews) or when the permission is denied. A bare
 * `await navigator.clipboard.writeText(x)` therefore throws an uncaught
 * rejection and the "Copied!" state may flip on while nothing was copied.
 *
 * This tries the async Clipboard API first, falls back to a hidden-textarea
 * `execCommand('copy')`, and RETURNS a boolean so callers can show real
 * feedback ("Copied" vs "Press ⌘C to copy") instead of lying.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

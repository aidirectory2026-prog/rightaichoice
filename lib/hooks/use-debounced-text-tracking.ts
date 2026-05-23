// Phase 8.g.11.b (2026-05-23) — universal keystroke-capture hook.
//
// Mounts on any <input>/<textarea> ref and fires ONE analytics event per
// pause (1 second of typing inactivity). Built so we can capture what
// users type in search + plan + chat + reviews + profile — the user
// explicitly asked for "every time a user types anything."
//
// Design notes:
//   - 1s idle commit (not per-keystroke) — keeps event volume sane while
//     still capturing every distinct edit
//   - Hard cap: 1 event per field per 1.5s (defensive — even if the user
//     pastes + retypes rapidly, we never exceed this)
//   - Min 2 chars before any fire (skip empty / single-char noise)
//   - Dedup: identical-text consecutive events are dropped
//   - PII guardrails baked in:
//       * Skips ANY <input type="password">
//       * Caps text at 500 chars
//       * Strips email addresses → "[email]"
//       * Strips 9+ digit number sequences (CC/phone) → "[number]"
//   - `capturePolicy: 'text' | 'meta'`
//       * 'text' (search + plan goal): sends the full (sanitised) string
//       * 'meta' (review / profile / newsletter): sends char_count +
//         word_count only — never the raw text. Default.

import { useCallback, useEffect, useRef } from 'react'

const PII_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PII_LONG_NUMBER = /\b\d{9,}\b/g

function sanitize(value: string): string {
  return value
    .slice(0, 500)
    .replace(PII_EMAIL, '[email]')
    .replace(PII_LONG_NUMBER, '[number]')
}

function wordCount(s: string): number {
  const t = s.trim()
  return t ? t.split(/\s+/).length : 0
}

export interface DebouncedTextTrackingOptions {
  /** Stable identifier for the field, e.g. 'home_goal_input', 'navbar_search'. */
  fieldId: string
  /**
   * 'text' = send the sanitised current text (search + plan goal only).
   * 'meta' = send char_count + word_count only (everything else — PII safety).
   */
  capturePolicy: 'text' | 'meta'
  /** Called with the event payload when a commit fires. */
  onCommit: (payload: {
    field_id: string
    char_count: number
    word_count: number
    current_text?: string
    final_blur?: boolean
  }) => void
  /** Idle ms before commit. Default 1000. */
  idleMs?: number
  /** Min chars before any fire. Default 2. */
  minChars?: number
}

export function useDebouncedTextTracking(opts: DebouncedTextTrackingOptions) {
  const { fieldId, capturePolicy, onCommit, idleMs = 1000, minChars = 2 } = opts
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFireAtRef = useRef<number>(0)
  const lastCommittedTextRef = useRef<string>('')

  const commit = useCallback(
    (text: string, finalBlur: boolean) => {
      const now = Date.now()
      if (now - lastFireAtRef.current < 1500) return // hard rate cap
      if (text.length < minChars && text.length > 0 && !finalBlur) return
      const sanitised = sanitize(text)
      if (sanitised === lastCommittedTextRef.current && !finalBlur) return
      lastCommittedTextRef.current = sanitised
      lastFireAtRef.current = now
      onCommit({
        field_id: fieldId,
        char_count: sanitised.length,
        word_count: wordCount(sanitised),
        current_text: capturePolicy === 'text' ? sanitised : undefined,
        final_blur: finalBlur || undefined,
      })
    },
    [fieldId, capturePolicy, onCommit, minChars],
  )

  /** Call this from the input's onChange. */
  const handleChange = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => commit(value, false), idleMs)
    },
    [commit, idleMs],
  )

  /** Call this from the input's onBlur to flush a final commit if user moved away mid-debounce. */
  const handleBlur = useCallback(
    (value: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (value.length >= minChars) commit(value, true)
    },
    [commit, minChars],
  )

  /** Optional escape hook to attach to a DOM element imperatively. */
  const bindToElement = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (!el) return
      // Refuse to bind to password inputs — PII guardrail.
      if (el instanceof HTMLInputElement && el.type === 'password') return
      const onInput = () => handleChange(el.value)
      const onBlur = () => handleBlur(el.value)
      el.addEventListener('input', onInput)
      el.addEventListener('blur', onBlur)
      return () => {
        el.removeEventListener('input', onInput)
        el.removeEventListener('blur', onBlur)
      }
    },
    [handleChange, handleBlur],
  )

  // Cleanup pending timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { handleChange, handleBlur, bindToElement }
}

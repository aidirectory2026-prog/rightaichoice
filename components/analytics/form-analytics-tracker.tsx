'use client'

// 10.7c.3 (2026-06-13) — generic form analytics over EVERY <form> on the
// site, mounted once from the root layout next to GlobalInteractionTracker.
// Document-level listeners (focusin / focusout / submit / invalid), so no
// per-form wiring is needed; real forms carry a stable `data-form-id`
// (auth_login, auth_signup, review, newsletter_<variant>, site_search,
// home_goal, plan_intake, qa_question, profile_edit, …) and anything
// without one falls back to `unlabeled:<path>`.
//
// What it captures (plan Phase 7c — "field focus/blur order, per-field
// correction counts, error shown, abandon point"):
//   - form_field_changed   on blur-with-changed-value: focus order +
//                          correction count + value LENGTH (never the text)
//   - form_validation_failed on native constraint-validation "invalid"
//   - form_submitted       on native submit (filled vs skipped field names)
//   - form_abandoned       once per touched-but-unsubmitted form, flushed on
//                          route change / pagehide (abandon point = last field)
//
// PII guard: values are never read beyond .length; password and hidden
// inputs are skipped entirely. Near-zero overhead: passive bookkeeping on
// focus boundaries only — nothing runs per keystroke.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'

const FIELD_EVENTS_MAX_PER_FORM = 30
const INVALID_MIN_GAP_MS = 2_000
const FILLED_NAMES_CAP = 20
const FOCUS_ORDER_CAP = 15

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

type FieldState = {
  focusOrder: number // 1-based first-focus position within the form
  editCycles: number // blur-with-changed-value count
  valueAtFocus: string
}

type FormSession = {
  formId: string
  firstFocusAt: number
  fields: Map<FormField, FieldState>
  focusOrderNames: string[]
  lastFieldName: string
  fieldEventsSent: number
  closed: boolean // submitted or already flushed as abandoned
}

function isTrackableField(target: EventTarget | null): target is FormField {
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLTextAreaElement) &&
    !(target instanceof HTMLSelectElement)
  )
    return false
  if (target instanceof HTMLInputElement) {
    const t = target.type
    if (t === 'password' || t === 'hidden' || t === 'submit' || t === 'button' || t === 'file') return false
  }
  return !!target.form
}

function fieldName(el: FormField): string {
  return (
    el.name ||
    el.id ||
    el.getAttribute('aria-label') ||
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder : '') ||
    el.tagName.toLowerCase()
  ).slice(0, 60)
}

function fieldType(el: FormField): string {
  if (el instanceof HTMLTextAreaElement) return 'textarea'
  if (el instanceof HTMLSelectElement) return 'select'
  return el.type || 'text'
}

function fieldValue(el: FormField): string {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
    return el.checked ? 'on' : ''
  return el.value
}

function formIdOf(form: HTMLFormElement, pathname: string): string {
  return form.dataset.formId || form.id || `unlabeled:${pathname}`
}

function firstValidityFlag(el: FormField): string {
  const v = el.validity
  for (const key of [
    'valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'tooShort',
    'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput', 'customError',
  ] as const) {
    if (v[key]) return key
  }
  return 'invalid'
}

export function FormAnalyticsTracker() {
  const pathname = usePathname()
  const sessionsRef = useRef<Map<HTMLFormElement, FormSession>>(new Map())
  const lastInvalidAtRef = useRef(0)

  useEffect(() => {
    const sessions = sessionsRef.current

    function sessionFor(form: HTMLFormElement): FormSession {
      let s = sessions.get(form)
      if (!s || s.closed) {
        s = {
          formId: formIdOf(form, pathname),
          firstFocusAt: Date.now(),
          fields: new Map(),
          focusOrderNames: [],
          lastFieldName: '',
          fieldEventsSent: 0,
          closed: false,
        }
        sessions.set(form, s)
      }
      return s
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target
      if (!isTrackableField(target)) return
      const s = sessionFor(target.form as HTMLFormElement)
      let f = s.fields.get(target)
      if (!f) {
        f = { focusOrder: s.fields.size + 1, editCycles: 0, valueAtFocus: fieldValue(target) }
        s.fields.set(target, f)
        if (s.focusOrderNames.length < FOCUS_ORDER_CAP) s.focusOrderNames.push(fieldName(target))
      } else {
        f.valueAtFocus = fieldValue(target)
      }
      s.lastFieldName = fieldName(target)
    }

    function onFocusOut(e: FocusEvent) {
      const target = e.target
      if (!isTrackableField(target)) return
      const form = target.form as HTMLFormElement
      const s = sessions.get(form)
      if (!s || s.closed) return
      const f = s.fields.get(target)
      if (!f) return
      const value = fieldValue(target)
      if (value === f.valueAtFocus) return // no edit this focus cycle
      f.editCycles += 1
      if (s.fieldEventsSent >= FIELD_EVENTS_MAX_PER_FORM) return
      s.fieldEventsSent += 1
      analytics.formFieldChanged({
        form_id: s.formId,
        field_name: fieldName(target),
        field_type: fieldType(target),
        has_value: value.length > 0,
        value_length: value.length,
        page_path: pathname,
        focus_order: f.focusOrder,
        corrections: Math.max(0, f.editCycles - 1),
      })
    }

    function onInvalid(e: Event) {
      const target = e.target
      if (!isTrackableField(target)) return
      const now = Date.now()
      if (now - lastInvalidAtRef.current < INVALID_MIN_GAP_MS) return
      lastInvalidAtRef.current = now
      analytics.formValidationFailed({
        form_id: formIdOf(target.form as HTMLFormElement, pathname),
        field_name: fieldName(target),
        error_code: firstValidityFlag(target),
      })
    }

    function onSubmit(e: Event) {
      const form = e.target
      if (!(form instanceof HTMLFormElement)) return
      const s = sessionFor(form)
      const filled: string[] = []
      let skipped = 0
      for (const el of Array.from(form.elements)) {
        if (!isTrackableField(el)) continue
        if (fieldValue(el).length > 0) {
          if (filled.length < FILLED_NAMES_CAP) filled.push(fieldName(el))
        } else {
          skipped += 1
        }
      }
      s.closed = true
      analytics.formSubmitted(s.formId, filled, skipped, Date.now() - s.firstFocusAt)
    }

    function flushAbandoned() {
      for (const [, s] of sessions) {
        if (s.closed || s.fields.size === 0) continue
        s.closed = true
        let corrections = 0
        for (const [, f] of s.fields) corrections += Math.max(0, f.editCycles - 1)
        analytics.formAbandoned({
          form_id: s.formId,
          page_path: pathname,
          last_field_name: s.lastFieldName,
          fields_touched: s.fields.size,
          corrections_total: corrections,
          seconds_on_form: Math.floor((Date.now() - s.firstFocusAt) / 1000),
          focus_order: s.focusOrderNames,
        })
      }
      sessions.clear()
    }

    // pagehide covers tab close / hard navigation; the effect cleanup below
    // covers SPA route changes. visibilitychange-hidden is deliberately NOT
    // an abandon (tab switches return).
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('invalid', onInvalid, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener('pagehide', flushAbandoned)

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('invalid', onInvalid, true)
      document.removeEventListener('submit', onSubmit, true)
      window.removeEventListener('pagehide', flushAbandoned)
      flushAbandoned() // route change = abandon point for touched forms
    }
  }, [pathname])

  return null
}

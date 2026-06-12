// Phase 10.5b.2 (2026-06-12) — schema-registry helpers for the events
// explorer.
//
// Pure data helpers over lib/analytics-schema.ts (property schemas) and
// lib/analytics-registry.ts (name lifecycle), importable from server and
// client components. Two jobs:
//   1. schemaPropKeys(event) — the payload property names an event's zod
//      schema declares. This is THE allowlist for the property-breakdown
//      RPC: getEventPropertyBreakdown refuses any key not returned here,
//      so the breakdown UI can never query a property that isn't part of
//      the event's verified schema.
//   2. eventLifecycle(name) — fired / planned / deprecated / unregistered,
//      plus whether an /admin surface consumes the event.

import type { z } from 'zod'
import { EVENT_SCHEMAS, type EventSchemaEntry } from '@/lib/analytics-schema'
import {
  ADMIN_CONSUMED_EVENTS,
  DEPRECATED_EVENTS,
  PLANNED_EVENTS,
} from '@/lib/analytics-registry'

/**
 * Extract the declared object keys from an event-payload zod schema.
 * Handles the two shapes EVENT_SCHEMAS actually uses: z.object(...).strict()
 * and z.union([object, object]) (legacy + rich emitters under one name —
 * keys are the union of both shapes, declaration order preserved).
 */
function zodObjectKeys(t: z.ZodType): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyT = t as any
  if (anyT?.shape && typeof anyT.shape === 'object') return Object.keys(anyT.shape)
  const options = anyT?.options ?? anyT?._def?.options
  if (Array.isArray(options)) {
    const seen = new Set<string>()
    for (const opt of options) for (const k of zodObjectKeys(opt)) seen.add(k)
    return [...seen]
  }
  return []
}

/** Payload property names declared by the event's schema ([] when the
 *  event has no EVENT_SCHEMAS entry). */
export function schemaPropKeys(eventName: string): string[] {
  const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[eventName]
  if (!entry) return []
  return zodObjectKeys(entry.props)
}

// ── Phase 10.6.4 — per-prop TYPES for the event-detail schema card ──
// zod v4 introspection (same defensive style as the CI guard): def.type
// names the node; optional/nullable unwrap; enums surface their values.

export interface SchemaPropType {
  key: string
  /** Human-readable type: string, number, boolean, enum(a|b), string[], … */
  type: string
  optional: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeZodType(t: any): { type: string; optional: boolean } {
  const def = t?.def ?? t?._def
  const typeName: string | undefined = def?.type ?? def?.typeName
  if (!typeName) return { type: 'unknown', optional: false }
  if (typeName === 'optional') {
    const inner = describeZodType(def.innerType)
    return { type: inner.type, optional: true }
  }
  if (typeName === 'nullable') {
    const inner = describeZodType(def.innerType)
    return { type: `${inner.type} | null`, optional: inner.optional }
  }
  if (typeName === 'array') {
    const inner = describeZodType(def.element)
    return { type: `${inner.type}[]`, optional: false }
  }
  if (typeName === 'enum') {
    const entries = def.entries ?? def.values
    const values = Array.isArray(entries) ? entries : entries ? Object.keys(entries) : []
    return { type: values.length > 0 ? `enum(${values.join('|')})` : 'enum', optional: false }
  }
  if (typeName === 'literal') {
    const values = def.values ?? (def.value !== undefined ? [def.value] : [])
    return { type: `literal(${[...values].map(String).join('|')})`, optional: false }
  }
  if (typeName === 'union') {
    const opts = (def.options ?? []) as unknown[]
    const parts = [...new Set(opts.map((o) => describeZodType(o).type))]
    return { type: parts.join(' | ') || 'union', optional: false }
  }
  if (typeName === 'record') return { type: 'record', optional: false }
  return { type: String(typeName), optional: false }
}

/** All object shapes under the event's props schema (1 for plain objects,
 *  n for the legacy/rich unions). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectShapes(t: z.ZodType): Array<Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyT = t as any
  if (anyT?.shape && typeof anyT.shape === 'object') return [anyT.shape]
  const options = anyT?.options ?? anyT?._def?.options
  if (Array.isArray(options)) return options.flatMap((o) => collectShapes(o))
  return []
}

/** Per-prop type descriptions for the event's schema, declaration order.
 *  A key missing from some union branch is reported optional. */
export function schemaPropTypes(eventName: string): SchemaPropType[] {
  const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[eventName]
  if (!entry) return []
  const shapes = collectShapes(entry.props)
  if (shapes.length === 0) return []
  const keys: string[] = []
  for (const shape of shapes) {
    for (const k of Object.keys(shape)) if (!keys.includes(k)) keys.push(k)
  }
  return keys.map((key) => {
    const present = shapes.filter((s) => key in s)
    const d = describeZodType(present[0][key])
    return {
      key,
      type: d.type,
      optional: d.optional || present.length < shapes.length,
    }
  })
}

export type EventLifecycleStatus = 'fired' | 'planned' | 'deprecated' | 'unregistered'

export interface EventLifecycle {
  status: EventLifecycleStatus
  /** An /admin surface reads this event (registry ADMIN_CONSUMED set). */
  adminConsumed: boolean
}

/**
 * Lifecycle from the registry: FIRED = has an EVENT_SCHEMAS entry (the CI
 * guard enforces schema ⇔ live call site), PLANNED = defined but not wired,
 * DEPRECATED = historical rows only, UNREGISTERED = rows exist in
 * user_events under a name no registry layer knows (invariant I11 material).
 */
export function eventLifecycle(eventName: string): EventLifecycle {
  const adminConsumed = ADMIN_CONSUMED_EVENTS.has(eventName)
  if (eventName in EVENT_SCHEMAS) return { status: 'fired', adminConsumed }
  if (PLANNED_EVENTS.has(eventName)) return { status: 'planned', adminConsumed }
  if (DEPRECATED_EVENTS.has(eventName)) return { status: 'deprecated', adminConsumed }
  return { status: 'unregistered', adminConsumed }
}

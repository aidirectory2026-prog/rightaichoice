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

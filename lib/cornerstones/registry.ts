import type { Cornerstone } from './types'
import { codeDevelopmentCornerstone } from './code-development'
import { imageGenerationCornerstone } from './image-generation'

/**
 * Cornerstone registry — keyed by category slug.
 *
 * To add a new cornerstone:
 *   1. Create `lib/cornerstones/<slug>.tsx` exporting a Cornerstone object.
 *   2. Register it here.
 *   3. That's it — `/categories/<slug>` automatically renders the
 *      editorial layer above the listing.
 */
const CORNERSTONES: Record<string, Cornerstone> = {
  'code-development': codeDevelopmentCornerstone,
  'image-generation': imageGenerationCornerstone,
}

export function getCornerstone(slug: string): Cornerstone | null {
  return CORNERSTONES[slug] ?? null
}

export function hasCornerstone(slug: string): boolean {
  return slug in CORNERSTONES
}

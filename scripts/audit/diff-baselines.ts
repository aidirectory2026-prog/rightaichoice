/**
 * Phase 10.7b/c gate helper — diff two snapshot-oracle baseline files.
 * Usage: npx tsx scripts/audit/diff-baselines.ts <old.json> <new.json>
 * Prints added / removed / changed pinned keys (value-level comparison).
 */
import { readFileSync } from 'node:fs'

const [oldPath, newPath] = process.argv.slice(2)
if (!oldPath || !newPath) {
  console.error('usage: diff-baselines.ts <old.json> <new.json>')
  process.exit(2)
}
type Baseline = { pinned: Record<string, { value?: unknown; error?: string }> }
const a = JSON.parse(readFileSync(oldPath, 'utf8')) as Baseline
const b = JSON.parse(readFileSync(newPath, 'utf8')) as Baseline

const ka = Object.keys(a.pinned)
const kb = Object.keys(b.pinned)
const removed = ka.filter((k) => !kb.includes(k))
const added = kb.filter((k) => !ka.includes(k))
const changed = ka.filter(
  (k) => kb.includes(k) && JSON.stringify(a.pinned[k].value) !== JSON.stringify(b.pinned[k].value),
)
console.log(`old: ${ka.length} pinned · new: ${kb.length} pinned`)
console.log(`removed (${removed.length}):`, removed)
console.log(`added (${added.length}):`, added)
console.log(`changed (${changed.length}):`, changed)
for (const k of changed) {
  const av = JSON.stringify(a.pinned[k].value)
  const bv = JSON.stringify(b.pinned[k].value)
  console.log(`\n— ${k}\n  old: ${av.slice(0, 400)}\n  new: ${bv.slice(0, 400)}`)
}
process.exit(changed.length || removed.length ? 1 : 0)

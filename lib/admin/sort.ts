// Phase 14 — URL-driven sorting for admin tables/lists.
//
// One convention every sortable admin table shares: the sort state lives in the
// URL (?sort=<key>&dir=asc|desc), so it's shareable/bookmarkable and survives the
// server re-render, exactly like the filter bar. Pages with MORE THAN ONE
// independently-sortable list pass a `scope` so their params don't collide
// (e.g. scope='tools' → ?tools_sort=views&tools_dir=desc).
//
// Sorting is applied IN-MEMORY in the server component on the already-fetched,
// bounded result set (top-N lists) via sortRows() — so no insights RPC changes.
// Pages that query a table directly may instead push sort into the DB (.order()).

export type SortDir = 'asc' | 'desc'
export type SortState<K extends string = string> = { key: K; dir: SortDir }

/** URL param names for a given scope ('' → the default sort/dir). */
export function sortParams(scope = ''): { sortKey: string; dirKey: string } {
  return scope ? { sortKey: `${scope}_sort`, dirKey: `${scope}_dir` } : { sortKey: 'sort', dirKey: 'dir' }
}

/**
 * Parse sort state from searchParams, validated against an allow-list (so a
 * hand-edited URL can never sort by an unknown/injected key). Falls back to the
 * page's default when absent or invalid.
 */
export function parseSort<K extends string>(
  sp: Record<string, string | undefined>,
  allowed: readonly K[],
  fallback: SortState<K>,
  scope = '',
): SortState<K> {
  const { sortKey, dirKey } = sortParams(scope)
  const key = sp[sortKey] as K | undefined
  const dir: SortDir | undefined = sp[dirKey] === 'asc' ? 'asc' : sp[dirKey] === 'desc' ? 'desc' : undefined
  if (key && allowed.includes(key)) return { key, dir: dir ?? fallback.dir }
  return fallback
}

/**
 * Stable in-memory sort of fetched rows. Numbers sort numerically, everything
 * else by locale string compare; NULL/undefined always sort LAST regardless of
 * direction (so "missing" never masquerades as smallest/largest).
 */
export function sortRows<T>(
  rows: readonly T[],
  key: string,
  dir: SortDir,
  accessor?: (row: T) => unknown,
): T[] {
  const get = accessor ?? ((r: T) => (r as Record<string, unknown>)[key])
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign
    // Numeric strings (e.g. "42") still compare numerically when both parse.
    const an = typeof av === 'string' ? Number(av) : NaN
    const bn = typeof bv === 'string' ? Number(bv) : NaN
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * sign
    return String(av).localeCompare(String(bv)) * sign
  })
}

/**
 * Supabase caps a single .select() at 1,000 rows by default. The build-time
 * sitemap and generateStaticParams paths need the full table — without
 * pagination they silently truncate at row 1,000, dropping every tool /
 * comparison / question / workflow added beyond that.
 *
 * Pass a pageFetcher that takes (from, to) inclusive zero-based indices and
 * returns a Supabase response. We loop in 1,000-row pages until we get a
 * short page (signaling end of table).
 */
export async function fetchAllPages<T>(
  pageFetcher: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  let from = 0
  while (true) {
    const { data } = await pageFetcher(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

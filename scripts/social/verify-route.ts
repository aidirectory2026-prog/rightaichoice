/**
 * Phase 13 Social — exercise the public graphic route handler directly (no server).
 * Turbopack rejects the worktree's node_modules symlink, so we invoke GET() in Node.
 * The font fetch falls back to Satori's default (no origin server) — fine for this check.
 *
 * Run: npm run social:verify-route -- <a-real-social_posts-uuid>
 */
export {}

import { writeFileSync } from 'fs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/social/graphic/[id]/route'

const realId = process.argv.slice(2).find((a) => !a.startsWith('-'))

async function hit(id: string, query = '') {
  const url = `http://localhost/api/social/graphic/${id}${query}`
  const res = await GET(new NextRequest(url), { params: Promise.resolve({ id }) })
  const ct = res.headers.get('content-type') ?? ''
  let bytes = 0
  if (res.status === 200) {
    const buf = Buffer.from(await res.arrayBuffer())
    bytes = buf.length
    writeFileSync(`/tmp/route-${id.slice(0, 8)}.png`, buf)
  }
  console.log(`  ${id.padEnd(40)} ${query.padEnd(28)} → HTTP ${res.status}  ${ct}  ${bytes ? bytes + ' bytes' : ''}`)
  return res.status
}

async function main() {
  console.log('\n=== graphic route handler ===')
  await hit('preview', '?t=tool_spotlight&size=square')
  await hit('preview', '?t=stat_card&size=landscape')
  if (realId) await hit(realId)
  else console.log('  (pass a real social_posts uuid to test the DB-lookup path)')
  const notFound = await hit('not-a-real-uuid')
  console.log(notFound === 404 ? '\n✓ bad id correctly 404s' : `\n✗ expected 404 for bad id, got ${notFound}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

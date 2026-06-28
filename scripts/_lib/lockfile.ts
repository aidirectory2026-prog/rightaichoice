/**
 * BUG-21 (Phase 13) — a tiny file lock for STATEFUL scripts (the mine/refresh
 * jobs that read-modify-write shared tables like seo_opportunities or tools).
 * Two concurrent runs of the same job double-insert / clobber each other; this
 * makes the second run fail fast instead.
 *
 * Usage (wrap the entrypoint):
 *   withLock('mine-gsc', main).catch((e) => { console.error(e); process.exit(1) })
 *
 * The lock is a file under .locks/ holding pid + start time. A lock older than
 * STALE_MS is assumed to belong to a crashed run and is overridden. The lock is
 * released on normal completion AND best-effort on exit / SIGINT / SIGTERM.
 */
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const LOCK_DIR = join(process.cwd(), '.locks')
const STALE_MS = 6 * 60 * 60 * 1000 // 6h — longer than any healthy run

function acquireLock(name: string): () => void {
  mkdirSync(LOCK_DIR, { recursive: true })
  const lockPath = join(LOCK_DIR, `${name}.lock`)
  if (existsSync(lockPath)) {
    const startedAt = Number(readFileSync(lockPath, 'utf8').split('|')[1] ?? 0)
    if (Number.isFinite(startedAt) && Date.now() - startedAt < STALE_MS) {
      throw new Error(
        `[lock] "${name}" is already running (${lockPath}). Wait for it to finish, or delete the lock if you're sure it's dead.`,
      )
    }
    console.warn(`[lock] overriding STALE lock for "${name}" (>${STALE_MS / 3_600_000}h old).`)
  }
  writeFileSync(lockPath, `pid:${process.pid}|${Date.now()}`)

  let released = false
  const release = () => {
    if (released) return
    released = true
    try {
      rmSync(lockPath)
    } catch {
      /* already gone */
    }
  }
  process.once('exit', release)
  process.once('SIGINT', () => {
    release()
    process.exit(130)
  })
  process.once('SIGTERM', () => {
    release()
    process.exit(143)
  })
  return release
}

/** Run `fn` (sync or async) while holding an exclusive file lock named `name`. */
export async function withLock<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  const release = acquireLock(name)
  try {
    return await fn()
  } finally {
    release()
  }
}

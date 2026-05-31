/**
 * Phase 9 (Automations & Catalog) D2 — manual runner for the gated onboard SOP.
 * Inserts of the draft rows happen separately (via SQL); this drives the SOP on
 * given slugs and prints the per-tool QA result.
 *
 *   tsx --env-file=.env.local scripts/run-onboard-sop.ts vercel linear datadog
 *   tsx --env-file=.env.local scripts/run-onboard-sop.ts            # oldest 5 drafts
 */
export {}
import { runOnboardSop } from '../lib/cron/onboard'

async function main() {
  const slugs = process.argv.slice(2).filter(Boolean)
  const res = await runOnboardSop(slugs.length ? { slugs, limit: slugs.length } : { limit: 5 })
  console.log(`\n=== SOP: ${res.published}/${res.processed} published, ${res.onboarded} onboarded ===`)
  for (const r of res.results) {
    const fails = Object.entries(r.checks)
      .filter(([, c]) => c.status === 'fail')
      .map(([k, c]) => `${k}(${c.detail})`)
    console.log(
      `\n• ${r.slug}: allGreen=${r.allGreen} published=${r.published}` +
        `\n   cats=${r.categorized} alts=${r.alternatives} compares=${r.editorialCompares} faqs=${r.faqs} logo=${r.logo} sentiment=${r.sentiment}` +
        (fails.length ? `\n   FAILED HARD GATES: ${fails.join(', ')}` : '') +
        (r.errors.length ? `\n   errors: ${r.errors.join('; ')}` : ''),
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

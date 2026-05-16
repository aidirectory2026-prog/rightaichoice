# SOP — Lighthouse + axe-core local audit

These two audits need a real browser (Chromium-headless), so they run locally on the operator's Mac, not on Vercel. The runbook + scoring rubric below makes a complete audit a 20-minute job.

**Frequency:** quarterly, OR before any major design refactor or marketing push.

---

## One-time setup

```bash
# Lighthouse CI (recommended over the npm `lighthouse` package — produces JSON + HTML reports)
npm install -g @lhci/cli

# axe-core CLI (accessibility)
npm install -g @axe-core/cli
```

Both are install-once. They auto-update Chromium when needed.

---

## The 8 sample pages (representative of every template type)

```
https://rightaichoice.com/                                        # home
https://rightaichoice.com/tools                                   # tools listing
https://rightaichoice.com/tools/chatgpt                           # tool detail (most-visited)
https://rightaichoice.com/tools/chatgpt/alternatives              # alternatives sub-page
https://rightaichoice.com/compare/chatgpt-vs-claude               # editorial compare
https://rightaichoice.com/categories/ai-chatbots                  # category landing
https://rightaichoice.com/best/best-ai-writing-tools              # best-of pillar
https://rightaichoice.com/plan                                    # planner (most-complex client)
```

---

## Run Lighthouse mobile audit

```bash
mkdir -p logs/lighthouse-$(date +%Y-%m-%d)
cd logs/lighthouse-$(date +%Y-%m-%d)

for url in \
  "https://rightaichoice.com/" \
  "https://rightaichoice.com/tools" \
  "https://rightaichoice.com/tools/chatgpt" \
  "https://rightaichoice.com/tools/chatgpt/alternatives" \
  "https://rightaichoice.com/compare/chatgpt-vs-claude" \
  "https://rightaichoice.com/categories/ai-chatbots" \
  "https://rightaichoice.com/best/best-ai-writing-tools" \
  "https://rightaichoice.com/plan"; do
  filename=$(echo "$url" | sed 's|https://rightaichoice.com||;s|/|_|g;s|^_||;s|^$|home|').report
  echo "→ $url"
  lhci collect --url="$url" --numberOfRuns=1 --settings.preset=mobile --settings.formFactor=mobile \
    --settings.output=html,json \
    --settings.outputPath="./${filename}.html"
done
```

This drops both HTML reports (visual) and JSON (scriptable) into `logs/lighthouse-<date>/`.

### Scoring rubric — pass/fail per page

| Category | Target | Yellow flag | Red flag |
|---|---|---|---|
| Performance | ≥ 80 mobile | 60-79 | < 60 |
| Accessibility | ≥ 95 | 85-94 | < 85 |
| Best Practices | ≥ 90 | 80-89 | < 80 |
| SEO | ≥ 95 | 90-94 | < 90 |

Specific Core Web Vitals targets (Google's thresholds):

- **LCP** < 2.5s (good), 2.5-4.0s (needs improvement), > 4.0s (poor)
- **CLS** < 0.1, 0.1-0.25, > 0.25
- **INP** (replaces FID) < 200ms, 200-500ms, > 500ms

### What to do with the findings

For each Red Flag finding, file a TODO entry in `Phase8(site-overhaul-v2)/build-log.md` with:
- Page URL
- Category (Performance / Accessibility / etc.)
- Lighthouse score before fix
- Recommended action from the Lighthouse "Opportunities" section
- Owner + ETA

Common fix targets we've seen:
- **LCP** → defer non-critical CSS, optimize the hero image (next/image with `priority`)
- **CLS** → reserve space for skeleton loaders + lazy-loaded ads
- **Accessibility** → missing alt text, low color contrast on emerald-on-zinc, button label issues

---

## Run axe-core accessibility audit

```bash
mkdir -p logs/axe-$(date +%Y-%m-%d)

for url in \
  "https://rightaichoice.com/" \
  "https://rightaichoice.com/tools" \
  "https://rightaichoice.com/tools/chatgpt" \
  "https://rightaichoice.com/tools/chatgpt/alternatives" \
  "https://rightaichoice.com/compare/chatgpt-vs-claude" \
  "https://rightaichoice.com/categories/ai-chatbots" \
  "https://rightaichoice.com/best/best-ai-writing-tools" \
  "https://rightaichoice.com/plan"; do
  filename=$(echo "$url" | sed 's|https://rightaichoice.com||;s|/|_|g;s|^_||;s|^$|home|')
  echo "→ $url"
  axe "$url" --tags wcag2a,wcag2aa --save "logs/axe-$(date +%Y-%m-%d)/${filename}.json" || true
done
```

### Severity buckets

axe outputs violations in 4 severity levels:
- **critical** — blocks assistive tech entirely (zero tolerance)
- **serious** — major usability issue (fix within 1 sprint)
- **moderate** — accessibility friction (fix within quarter)
- **minor** — best-practice deviation (track but defer)

For each critical or serious, file the same TODO pattern as Lighthouse.

---

## Quarterly audit cadence

| Quarter | Action |
|---|---|
| End of each calendar quarter | Run BOTH audits across all 8 pages |
| Output | Append summary to `Phase8(site-overhaul-v2)/build-log.md` under "Audit — YYYY-QN" |
| Trend | Spot regressions vs prior quarter — perf scores should hold or improve |
| Action | Critical/Red findings → tracked items, fix within 14 days |

---

## Why these aren't automated as Vercel crons

Both audits need a real Chromium browser process with full DOM rendering. Vercel Functions don't bundle Chromium (would balloon function size + cold-start time). The alternatives — Lighthouse CI's hosted server, or PageSpeed Insights API — work but cost more than the quarterly cadence justifies. Local runs every 3 months hit the marginal-cost sweet spot.

**One exception:** if Core Web Vitals tank suddenly (visible in GSC's Core Web Vitals report), drop the quarterly cadence and run immediately to localize the regression.

# SOP — Manual UX walkthrough checklist

A ~30 min hands-on click-through of every critical user flow on a real device. Catches everything that automation can't: copy that reads wrong, animations that lag on real CPU, taps that miss on real fingers, flows that *technically work* but don't feel right.

**Frequency:** before any marketing push, after every major release, monthly during heavy iteration.

**Devices:** at least one of each:
- **Desktop** — Chrome on macOS, Safari on macOS
- **Mobile** — iPhone (real device, not simulator) on iOS Safari + Chrome iOS

---

## Checklist (tick as you go)

Open this doc on a second screen so you can check off as you go. Each item should pass on BOTH desktop + mobile unless noted.

### 1. Home page (`/`)

- [ ] Hero loads in ≤ 2 seconds on a real 4G/LTE connection
- [ ] Goal input accepts typing + chip suggestions are tappable (mobile)
- [ ] Newsletter capture in hero (Phase 7K placement) works — enter email, see success
- [ ] Stack Assembly demo animation runs smoothly (no jank)
- [ ] Featured tools rail scrolls horizontally on mobile (swipe)
- [ ] Footer columns stack correctly on mobile (no overflow)
- [ ] No console errors (open DevTools Console while testing)

### 2. Tool detail (`/tools/chatgpt` — flagship)

- [ ] Hero with logo + tagline + pricing badge + Visit Website CTA renders cleanly
- [ ] "Editorial Verdict" + "Behind the Verdict" headings are distinct (NOT both "Our X")
- [ ] "Latest from ChatGPT" section shows at least 3 items with dates + source pills
- [ ] Viability Score badge renders (or hidden if score < threshold)
- [ ] Pricing Plans Comparison table renders all tiers + "ideal for" annotations
- [ ] Workflow Scenarios render with persona + outcome
- [ ] FAQs expand on click
- [ ] Alternatives rail shows 4-6 tools (no empty cards)
- [ ] Recent compares (related compares) rail shows 3-6 entries
- [ ] Mobile sticky action bar (Save / Visit) sits above keyboard, not blocked by it
- [ ] Compare Tray (bottom) appears when you click "Add to compare"
- [ ] Save button writes to DB (verify in /saved)

### 3. Compare page (`/compare/chatgpt-vs-claude`)

- [ ] TLDR comparison table renders all 5-6 dimensions
- [ ] Editorial verdict + feature analysis + pricing analysis all populated (no "[Loading]" or empty blocks)
- [ ] Use Cases section shows 3-5 persona recommendations
- [ ] FAQs render below
- [ ] Related compares rail at bottom
- [ ] Switching between tools' detail links works (link to /tools/chatgpt + /tools/claude)
- [ ] Mobile: comparison table scrolls horizontally without breaking row alignment
- [ ] OpenGraph image (visible in browser tab + share preview) renders the tool names

### 4. Category landing (`/categories/ai-chatbots`)

- [ ] Filter bar (pricing / skill level / platform / has-API / sort) all work
- [ ] Pagination works (URL changes to ?page=N, content updates)
- [ ] Tool cards render with logo, tagline, pricing badge, viability, view-count
- [ ] "No reviews yet" text fits inside card boundary (regression check for Phase 0.5 fix)
- [ ] Related compares rail at bottom

### 5. Best/Stacks/For pages

- [ ] `/best/best-ai-writing-tools` — pillar copy + top-10 list render
- [ ] `/stacks/marketing-agency` — stack of 5-7 tools with phase grouping
- [ ] `/for/marketers` — role-page with 3 stacks + relevant tools

### 6. Planner (`/plan`)

- [ ] Type a goal ("I want to build a landing page")
- [ ] AI stream returns plan with stages + tools within 30 seconds
- [ ] Intake modal appears for goal clarification (if profile incomplete)
- [ ] Save Stack button writes to DB → appears in /stacks/saved
- [ ] Export Stack downloads a Markdown file
- [ ] Newsletter capture at plan completion renders + accepts email
- [ ] "Plan another" button starts fresh flow

### 7. Search (`/search?q=email`)

- [ ] Returns relevant tools (not 0 results)
- [ ] Tool cards link to detail pages
- [ ] No flash of empty results before render

### 8. Newsletter

- [ ] Subscribe from home hero → success message
- [ ] Subscribe from footer → success message
- [ ] Mobile sticky bottom newsletter form appears after ~4s + can be dismissed
- [ ] Dismissed banner doesn't reappear for 14 days (clear localStorage to re-test)
- [ ] `/unsubscribe` page accepts email + writes `unsubscribed_at`

### 9. Admin (`/admin/*` — requires admin login)

- [ ] `/admin/daily` — all 5 checklist tasks render with live counts
- [ ] `/admin/updates` — today's hero card + 60-day history table render
- [ ] `/admin/authority` — RD form + table render; add-form works end-to-end
- [ ] `/admin/analytics` — charts render with last-30-days data
- [ ] `/admin/tools` — search + filter works; can click into a tool

### 10. Auth flows

- [ ] Login → preserves the `next` URL (visit /tools/chatgpt → click Save → log in → land back on /tools/chatgpt)
- [ ] Signup → email verification flow works
- [ ] Logout → clears session, returns to home
- [ ] No "open redirect" possible (try `/login?next=https://evil.com` — should reject)

### 11. Edge cases

- [ ] 404 on `/tools/this-tool-does-not-exist` shows a clean not-found page (not a stack trace)
- [ ] Robots.txt at `/robots.txt` is non-empty and includes the AI-bot allow-list
- [ ] Sitemap at `/sitemap-index.xml` returns valid XML with 8 sub-sitemaps listed
- [ ] OG image at `/compare/chatgpt-vs-claude/opengraph-image` returns an image (visible in browser)

---

## Reporting

For every checkbox that fails, file a row in `Phase8(site-overhaul-v2)/build-log.md`:

```
| Date | Surface | Device | Issue | Severity |
|---|---|---|---|---|
| 2026-XX-XX | /tools/chatgpt | iOS Safari | Mobile sticky bar overlaps keyboard on focus | P1 |
```

P0 (broken flow) → fix within 24h. P1 (annoying) → 1 week. P2 (cosmetic) → next sprint.

---

## Time-box

Don't let this become a 3-hour deep dive. **30 minutes flat.** If a checkbox is ambiguous (e.g. "render cleanly"), it passes by default — file an issue only if something is *clearly* broken or off.

The next walkthrough will catch what this one missed. The whole point is breadth + cadence over depth.

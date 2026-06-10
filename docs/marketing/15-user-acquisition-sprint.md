# Doc 15 — User Acquisition Sprint (post-demotion plan)

**Created:** 2026-06-10 · **Status:** ACTIVE — this is the priority playbook until we have real users
**Trigger:** June 3 Google demotion (impressions −96%, clicks ~0) + audit showing 3 real users ever, 0 retained, 99% of affiliate outclicks bot-generated.

---

## The honest baseline (2026-06-10)

| Metric | Value | Source |
|---|---|---|
| Google organic clicks | ~0/day (peak ever: 7) | GSC API |
| Google impressions | ~150/day (was 5,068 peak May 30) | GSC API |
| Human-ish visitors | ~100–140/day (92% of viewing IDs show engagement) | user_events 7d |
| Returning visitors | 2.9% (45 of 1,563 IDs) | user_events 7d |
| Registered users | 5 (2 are owner) → **3 real, 0 retained** | profiles + auth.users |
| Email list | 0 | newsletter_subscribers |
| Affiliate outclicks | 99% bot (647/654 from IDs with zero page views) | user_events 7d |
| Revenue | $0 (PayPal sandbox) | sentiment_payments |

**Core insight:** we don't just have a traffic problem — we have a *capture* problem.
~100 humans/day already arrive and 97% leave forever, anonymously. Fixing traffic 10×
at 0% capture is still 0 users. So this plan runs two tracks at once: new demand
channels that don't need Google authority (A), and capture/retention of every visitor
we already get (B). Google recovery (C) runs in the background — it is gated on
authority and the next core-update re-evaluation, i.e. months, and nothing we do this
week changes that timeline except backlinks.

---

## Track A — Demand channels that work at zero domain authority

### A1. The 3-platform launch sequence (backlinks start here) — Weeks 1–3
Execute the deferred playbook in order of rising risk, with the **Sentiment Checker as
the hook** — a stranger can get value in 30 seconds, which beats any directory pitch.

1. **Reddit (Week 1, 5 posts, one per day, distinct content each — copy-paste = ban):**
   r/SideProject, r/ChatGPTCoding, r/LocalLLaMA, r/artificial, r/SaaS.
   Frame: value-first finding, not pitch. Best pattern: *"I scanned Reddit sentiment on
   [hot tool X] vs [Y] — here's what people actually complain about"* and link the
   sentiment page as the resource. Post from your real account; answer every comment
   within 2 hours for the first 8 hours.
2. **Hacker News — Show HN (Week 2, Tue/Wed morning PST):**
   "Show HN: I built a sentiment scanner for AI tools (scans Reddit/forums so you don't
   have to)". Two-paragraph intro: why, and what's different from G2/listicles. No
   marketing-speak — HN punishes it.
3. **Product Hunt (Week 3–4, launch 00:01 PST Tuesday):**
   Launch the **Sentiment Checker** as the product (not the whole site). Prep: tagline,
   3–5 gallery images, maker comment, first-comment script; line up 10–20 connections.

Realistic payoff per the original playbook: one moderate hit = 1,000–5,000 visitors +
2–5 dofollow backlinks from aggregators → the first real authority signal Google sees.

### A2. AI search (AEO) — already working, double down
ChatGPT + Perplexity already refer visitors with **zero** authority — the only organic
channel that ignores DA. Weekly: check /admin/ai-citations, keep llms-full fresh, keep
direct-answer blocks tight on money pages. Verify Bing Webmaster numbers monthly —
Bing powers ChatGPT search and DuckDuckGo and doesn't run Google's authority gauntlet.

### A3. LinkedIn organic (existing 30-day plan)
3 posts/week minimum, each built on **original sentiment data** ("we analyzed 1,200
Reddit threads on Cursor — 3 surprising complaints"). Data posts travel; opinions don't.

### A4. Data PR (the compounding backlink machine)
/blog/state-of-ai-tools-2026 exists as a link magnet. Pitch it + monthly "sentiment
movers" stats to AI newsletters (Ben's Bites, The Rundown, TLDR AI) and journalists.
Original data is the only content that earns links without asking twice.

---

## Track B — Capture & retain the ~100/day we already get

Priority builds (small, in order — each one converts anonymous traffic into owned audience):

1. **B1. Email-gate the sentiment scan result** *(highest leverage, smallest build)*:
   show the score free, require email to see the full report ("email me this report").
   Every scan = a subscriber. Today: 0 subscribers.
2. **B2. "Email me my stack"** on /plan results — same pattern, second capture point.
3. **B3. Weekly sentiment-movers digest** — auto-generated from data we already compute
   (top risers/fallers). This is the retention loop; 2.9% return rate means nothing
   brings people back today. Pipeline automation already exists to power it.
4. **B4. Sentiment watchlist for registered users** — "alert me when sentiment on X
   changes." Gives signup a real reason to exist.
5. **B5. PayPal decision:** keep Sentiment Checker **free for 30 days** and optimize for
   emails + users, not revenue. $0 either way right now; a list is worth more than the
   first $20.

## Track C — Google recovery (background, don't obsess)

1. **Prune/merge thin pages** (doc 06 Tier-4): noindex or consolidate zero-impression
   tool pages. The demotion judged our thin:quality ratio — shrink the denominator
   before the next core update. **No new programmatic pages until authority exists.**
2. **Backlinks point at:** homepage + sentiment checker + 3–5 money pages. Never deep
   thin pages.
3. Keep the 50 money pages improving (doc 21 plan) — they're what gets re-evaluated.

## Track D — Weekly scorecard (the only numbers that count now)

Every Monday, from /admin/insights (bot-flagged traffic now excluded as of PR #12):

| Metric | Baseline 06-10 | 30-day target |
|---|---|---|
| Human visitors/day | ~120 | 400 |
| Email subscribers | 0 | 300 |
| Registered users (real) | 3 | 50 |
| Returning-visitor rate | 2.9% | 10% |
| Referring domains | ~0 | 5 |
| AI citations (tracked) | baseline TBD | +50% |
| Human outclicks/day | ~1 | 20 |

**Not** a KPI anymore: GSC impressions (proven mirage), raw outclicks (proven 99% bot).

---

## 14-day execution order

- **Day 1 (tomorrow):** B1 email-gate build + first Reddit post. Owner: backlink outreach list (10 AI directories/newsletters that accept submissions).
- **Day 2–6:** one Reddit post/day (A1 list), B2 + B3 builds ship.
- **Day 7:** review scorecard; adjust subreddit list by what got traction.
- **Day 8–9:** Show HN (Tue/Wed PST). Reply marathon.
- **Day 10–13:** PH assets prep; B4 watchlist build; Tier-4 prune executes.
- **Day 14:** scorecard review #2; lock PH launch date (next Tuesday 00:01 PST).

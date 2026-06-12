# Phase 10.7a Gate — Source & attribution capture

Date: 2026-06-12 · Branch: `phase10-admin` · Spec: docs/admin/phase10-plan.md §Phase 7 (7a + 7d iron rule)

## What shipped

| Unit | Commit | Contents |
| --- | --- | --- |
| 10.7a.1 | `26a243a` | `lib/analytics/channels.ts` — pure table-driven channel classifier (search/ai/social/community/email/paid/referral/direct/internal), exported host map + internal list, click-id parsing, hand-label validated |
| 10.7a.2 | `e80b8ad` | Capture wiring: BASE_CONTEXT schema keys; mirrorContext stamps classification + click-ids; `rac_first_touch_v1` extended (channel/source/click_ids, backward-compatible read); migration **159** — `user_intent_profile.touch_history` jsonb + `upsert_user_intent` `p_touch` append (dedupe/30-min-gap/cap-50); track-mirror sends one touch per distinct_id per batch |
| 10.7a.3 | `26dc466` | Admin: migration **160** — `insights_top_property` channel branch (visitors, epoch-aware); `TRACKING_EPOCHS.channel` in `lib/admin/constants.ts`; Channels BarList on Dashboard + Insights with ⓘ provenance (`top_channels`); User 360 first-touch channel chip; Users-directory Channel column; snapshot key added |
| 10.7a.4 | (this commit) | **Collision fix caught by the suite's first full run**: `channel` is a real payload property of `share_clicked` (share destination) — envelope keys renamed `traffic_channel`/`traffic_source` across schema/capture/RPC; migration **161** moves the RPC branch to `properties->>'traffic_channel'` (p_property `'traffic_channel'`); synthetic channel probes + gate doc |

Migrations applied to live (MCP, from live definitions): **159, 160, 161**.

## Iron rule (7d) compliance

New properties (no new event names — registry untouched): `traffic_channel`,
`traffic_source`, `gclid`, `fbclid`, `msclkid`, `ttclid` — all (1) declared in
`BASE_CONTEXT_SCHEMA` + `BASE_CONTEXT_PROP_KEYS` first, (2) then captured in
`mirrorContext()`, (3) then covered by two dedicated synthetic probes, (4) full
suite re-run 100% green. `npm run tracking:schema` green throughout (10 admin
property reads checked; the `traffic_channel` RPC read is base-context-covered).

## Hand-label validation (gate requirement)

Plan calls for 100 hand-labeled referrers; the live 90-day `user_events`
window contains exactly **18 distinct referrer hosts** — all hand-labeled,
classifier agrees **18/18**:

| Referrer host (90d) | Events | Channel | Source |
| --- | ---: | --- | --- |
| rightaichoice.com | 1451 | internal | rightaichoice.com |
| accounts.google.com (OAuth bounce) | 878 | internal | accounts.google.com |
| www.google.com | 778 | search | google |
| chatgpt.com | 118 | ai | chatgpt |
| localhost:3000 | 78 | internal | localhost |
| www.linkedin.com | 33 | social | linkedin |
| yandex.ru | 20 | search | yandex |
| android-app://com.google.android.googlequicksearchbox | 18 | search | google |
| www.perplexity.ai | 16 | ai | perplexity |
| notebooklm.google.com | 9 | ai | notebooklm |
| summitfy.ai | 8 | referral | summitfy.ai |
| rightaichoice-*-projects.vercel.app (preview) | 8 | internal | (host) |
| analytics.google.com (GA dashboard click-out) | 8 | referral | analytics.google.com |
| www.bilibili.com | 8 | social | bilibili |
| www.facebook.com | 8 | social | facebook |
| bing.com | 7 | search | bing |
| ahrefs.com | 5 | referral | ahrefs.com |
| www.seo-stuff.com | 2 | referral | seo-stuff.com |

Precedence spot-checks: gclid beats organic google (`paid/google_ads`);
`utm_medium=cpc → paid`; `utm_medium=email → email`; reddit + HN →
**community** (not social, per plan §7a); `mail.google.com → email/gmail`;
google ccTLDs → search; `t.co → social/x`.

## The collision the suite caught (why traffic_*)

First full suite run after 10.7a.3 failed exactly one recipe:
`share_clicked — recipe payload fails its own schema: channel: expected
string, received undefined`. Root cause: `share_clicked` already carries a
payload property named `channel` (twitter/linkedin/…). A bare `channel`
envelope key (a) got stripped by the base-context filter before the strict
check, and (b) would have been **clobbered** by the mirrorContext stamp,
corrupting real share data. Resolution: envelope keys namespaced
`traffic_channel`/`traffic_source` everywhere (schema, capture, touch
builder, RPC, admin reads). This is the synthetic suite working as designed.

## Verification results (all green)

- **Synthetic suite (full, runtime 102.1s, 22 browser / 57 payload)**:
  79/79 events verified, dedup 3/3, negative
  (tag-don't-drop) PASS, **channel probe browser PASS** (real navigation to
  `/?utm_source=test&utm_medium=cpc&gclid=test123` with a facebook.com
  puppeteer referer → `traffic_channel=paid`, `traffic_source=google_ads`
  (gclid wins precedence), `gclid=test123` stored, top-level utm columns
  landed), **channel probe payload PASS** (chatgpt.com referrer →
  `traffic_channel=ai`/`chatgpt` stored untagged). Cleanup verified 0 rows.
- **tracking:schema**: green (79 fired = 79 schema'd; 10 admin property
  reads checked).
- **Baseline snapshot vs post-phase6**: byte-identical — 0 changed, 0
  removed; only the 2 documented new keys `insights.getTopChannels.humans`
  (214 — exactly the Visitors tile) / `.withBots` (1080), both the single
  `(unknown — pre-channel epoch)` bucket since the pinned week predates the
  epoch. 53 pinned keys, 0 errors, 0 nondeterministic.
- **Filter-matrix verifier**: 15 combos × 2 assertions + 6 extended checks
  = 36 checks ALL GREEN (matrix unchanged — no channel filter added, see
  deferrals).
- **Authed smoke (local)**: see numbers below.
- **Migration 159 live probes**: dedupe-within-30min ✓, new-signature
  append ✓, 30-min-gap append ✓, legacy call without p_touch ✓, cap-50
  oldest-drop ✓ (probe row deleted).

### Authed smoke

Local (`http://localhost:3000`), disposable admin user, all routes WITH
authenticated cookies: **37/37 pass** — 34 × 200 (every nav route +
param'd extras incl. `/admin`, `/admin/insights`, `/admin/insights/users`,
the filtered/event/property variants, unknown-visitor user 360) and the 3
expected 307 legacy redirects (`journey/*`, `insights/health`). Zero 5xx.

## Epochs & semantics (owner-facing)

- `TRACKING_EPOCHS.channel = 2026-06-12`. Events before that date have no
  classification and surface as **"(unknown — pre-channel epoch)"** — shown,
  never hidden.
- The Channels panel is **per-event** channel (what the traffic in the window
  arrived on); the sticky per-visitor original source stays in Top sources
  (first-touch). In-app navigation classifies as `internal` by design.
- `touch_history` (profile): append-only array of
  `{ts, channel, source, medium, campaign, landing}`, deduped on consecutive
  identical source signatures within 30 minutes, capped at 50 (oldest
  dropped) — first-touch AND last-touch AND the full path are recoverable.
- Side effect (improvement): anonymous visitors now get a
  `user_intent_profile` row on their first batch (the touch triggers the
  upsert), which also persists their `first_touch_*` columns — the
  '(unknown)' bucket in Top sources shrinks going forward.

## Deferred (explicitly)

1. **Channel filter in the global filter bar** — requires touching the
   audited shared predicate on BOTH sides (`insights_apply_filters` SQL +
   `applyFilters()` TS mirror) plus a verifier combo; deliberately deferred
   as a Phase-9-era follow-up rather than rushed through the audited
   surface. (Spec allowed: "do it now ONLY if it threads cleanly".)
2. **Search-keyword capture from referrers** (plan §7a) — modern engines
   strip keywords from referrers (`google.com` sends none); nothing to
   capture today. Revisit only if a keyword-bearing engine shows up in the
   review queue.
3. **Unknown-host review queue as a dedicated surface** — unknown hosts
   already surface verbatim in Top sources / as `referral/<host>` in
   Channels; a dedicated admin queue can come with Phase 7 follow-ups.
4. **Mixpanel parity** — traffic_channel/click-ids ride only in the mirror
   envelope (mirror is the queryable store; Mixpanel free tier is
   display-only). Stamp into Mixpanel super-props later if ever needed.

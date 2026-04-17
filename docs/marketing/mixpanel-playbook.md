# Mixpanel — Click-Through Playbook

Follow this top to bottom once. Takes 60–90 minutes. You will end with every Board, Funnel, Goal, Cohort, and Retention report the analytics plan in `tracking-mechanisms-and-goals.md` calls for.

This doc is the manual equivalent of `scripts/mixpanel/config/*.ts` — both define the same target state. If you change one, change the other.

**Prerequisites:** logged into Mixpanel with the owner account, on project **4014921** (EU). Event names in this playbook exactly match `lib/analytics.ts` / `scripts/mixpanel/config/events.ts`. Copy them literally.

---

## 0. Before you start

1. **Smoke test first.** Run `npm run mixpanel:verify` locally. All three checks must be green. If the ingestion check fails, nothing below will have data to render.
2. **Seed some events.** Visit localhost, browse tools, save one, start a plan, search something. Without seed events many Board charts will show "no data" and you won't be able to tell whether the chart is correctly configured.

---

## 1. Lexicon — event & property descriptions

If `npm run mixpanel:lexicon` succeeded, skip this section (the descriptions are already applied). If it failed due to the free tier, paste the descriptions manually.

1. Mixpanel → Data Management (left sidebar, grid icon) → **Lexicon**.
2. For each event in `scripts/mixpanel/config/events.ts`:
   - Click the event → **Edit**.
   - **Description**: copy the `description` field from the config file, plus the `firesOn` and `whyItMatters` appended as: `[category] description — Fires: firesOn — Why: whyItMatters`.
   - Save.
3. For each property: click it → set description from the config file → save.

Budget: 5 minutes.

---

## 2. Lexicon — one-time configuration

Still in Data Management:

- **Event Approvals** → turn **ON**. This enforces that only events that exist in Lexicon get graphed — catches typos the moment someone pushes new code.
- **Group Keys** → add group key `user_plan` (display name "User plan"). This is the only group key we use.
- **Identify Merge** → confirm it's set to **API-based** (the default). Our `analytics.identify()` does the merging.

---

## 3. Cohorts

Mixpanel → **Users** → **Cohorts** (filter icon) → **+ Create cohort**.

Create each of the 7 below. For every one: Name + Description exactly as written, Refresh per the cadence column, Share with your own account as owner.

### 3.1 Activated users
- **Definition:** users who **Did** `activation_milestone` **at least 1 time** **ever**.
- Refresh: 1 hour.

### 3.2 Power users (14d)
- **Definition:** users who **Did** `tool_saved` **at least 3 times** **in the last 14 days**.
- Refresh: 1 hour.

### 3.3 Comparison-driven users
- **Definition:** users who **Did** `comparison_viewed` **at least 1 time** **ever**.
- Refresh: 1 hour.

### 3.4 Plan completers
- **Definition:** users who **Did** `plan_completed` **at least 1 time** **ever**.
- Refresh: 1 hour.

### 3.5 AI chat users
- **Definition:** users who **Did** `ai_chat_message` **at least 1 time** **in the last 30 days**.
- Refresh: 1 hour.

### 3.6 At-risk users
- **Definition (two clauses — use "and" between them):**
  - **Did** `page_viewed` **≥1 time** **between 28 and 14 days ago** (select a custom range).
  - **Did not do** `page_viewed` **in the last 14 days**.
- Refresh: 6 hours.

### 3.7 High-intent leavers
- **Definition (two clauses — "and"):**
  - **Did** `pricing_viewed` **≥1 time** **in the last 30 days**.
  - **Did not do** `upgrade_clicked` **in the last 30 days**.
- Refresh: 6 hours.

---

## 4. Funnels — 12 funnels + Goals

Mixpanel → **Reports** → **Funnels** → **+ New**.

For each funnel:
1. Add every step in order. If a step has a **filter** (e.g. `step_index = 0`), click the step's settings gear → add filter.
2. Set **Conversion window** per the table.
3. If a **Breakdown** is specified, click "Break down by" and add the property.
4. **Save** with the exact name.
5. Open the saved funnel → **...** menu → **Goals** → **+ New Goal** → fill thresholds (see below). Set alerts if the Funnel table shows an `Alert if below` value.

### 4.1 Discovery — page → tool → visit  `(id: discovery_tool_visit)`
- Steps: `page_viewed` → `tool_page_viewed` → `tool_visit_clicked`
- Conversion window: **1 day**
- Breakdown: `first_touch_utm_source`
- **Goal — conversion rate (full funnel):** Jun 4% / Jul 6% / Aug 8% / Sep 10%. Alert if conversion rate < 75% of the month's target for 3 consecutive days.

### 4.2 Plan wizard  `(id: plan_wizard)`
- Steps (all `plan_step_completed` rows filter on `step_index`):
  1. `plan_started`
  2. `plan_step_completed` where `step_index = 0`
  3. `plan_step_completed` where `step_index = 1`
  4. `plan_step_completed` where `step_index = 2`
  5. `plan_completed`
- Conversion window: **1 day**
- Breakdown: `source`
- **Goal:** Jun 25% / Jul 35% / Aug 45% / Sep 55%. Alert below 70% of target.

### 4.3 Compare → share  `(id: compare_share)`
- Steps: `compare_tool_added` → `comparison_viewed` → `compare_share_clicked`
- Conversion window: **1 hour**
- **Goal — volume metric:** `compare_share_clicked` per 100 `comparison_viewed`. Target 3 / 5 / 7 / 10.

### 4.4 Signup → activation  `(id: signup_activation)`
- Steps: `signup_started` → `signup_completed` → `activation_milestone`
- Conversion window: **1 day**
- Breakdown: `method`
- **Goal:** Jun 20% / Jul 30% / Aug 40% / Sep 50%. Alert below 70% of target.

### 4.5 Workflow usage  `(id: workflow_usage)`
- Steps: `workflow_generated` → `workflow_saved` → `workflow_shared`
- Conversion window: **7 days**
- **Goal:** generated → saved rate. Jun 30% / Jul 40% / Aug 45% / Sep 50%.

### 4.6 Stack → export  `(id: stack_export)`
- Steps: `stack_viewed` → `stack_saved` → `stack_exported`
- Conversion window: **7 days**
- **Goal:** viewed → exported. Jun 1% / Jul 2% / Aug 2.5% / Sep 3%.

### 4.7 AI chat — suggestion quality  `(id: ai_chat_quality)`
- Steps: `ai_chat_message` → `ai_chat_tool_suggested` → `ai_chat_tool_clicked`
- Conversion window: **1 hour**
- **Goal:** suggested → clicked. Jun 15% / Jul 22% / Aug 26% / Sep 30%. Alert below 65% of target.

### 4.8 Newsletter capture  `(id: newsletter_capture)`
- Steps: `page_viewed` → `newsletter_subscribed`
- Conversion window: **1 hour**
- **Goal — volume:** newsletter signups/month. Jun 40 / Jul 100 / Aug 250 / Sep 500.

### 4.9 Pricing → upgrade  `(id: monetization)`
- Steps: `pricing_viewed` → `upgrade_clicked`
- Conversion window: **1 hour**
- **Goal:** intent-only pre-revenue. Aug 3% / Sep 6%.

### 4.10 Content → product  `(id: content_to_product)`
- Steps: `blog_post_viewed` → `blog_internal_link_clicked` → `tool_page_viewed`
- Conversion window: **1 day**
- **Goal:** Jun 8% / Jul 12% / Aug 15% / Sep 18%.

### 4.11 Search quality  `(id: search_quality)`
- Steps: `search_query_submitted` → `search_result_clicked` → `tool_page_viewed`
- Conversion window: **1 hour**
- Breakdown: `query`
- **Goal:** search → click. Jun 30% / Jul 40% / Aug 45% / Sep 50%.

### 4.12 New user → activation 24h  `(id: new_user_activation)`
- Steps: `page_viewed` (filter `first_session = true`) → `activation_milestone`
- Conversion window: **1 day**
- **Goal:** Jun 20% / Jul 30% / Aug 40% / Sep 50%. Alert below 70% of target.

**Note on `first_session`:** this is a super property we set on the very first `page_viewed` of a new distinct_id. If you don't see it in the property list yet, fire a few events first — Mixpanel reveals new properties only after they're seen at least once.

---

## 5. Retention reports

Mixpanel → **Reports** → **Retention** → **+ New**. For each:

### 5.1 `new_user_weekly`
- **Did** event: `page_viewed` with filter `first_session = true`
- **Came back and did**: `page_viewed`
- **Unit:** Weekly
- **Duration:** 12 weeks
- Save as "New user — weekly retention".

### 5.2 `activated_vs_not` (overlay)
- Base report same as 5.1.
- Click "Compare" → add another segment: `first_session = true` AND fired `activation_milestone` within 24h.
- Save as "Activated vs non-activated retention (overlay)".

### 5.3 `plan_completer_retention`
- **Did:** `plan_completed`
- **Came back and did:** `page_viewed`
- Weekly, 8 weeks.
- Save as "Plan completer retention".

### 5.4 `comparison_user_retention`
- **Did:** `comparison_viewed`
- **Came back and did:** `page_viewed`
- Weekly, 8 weeks.
- Save as "Comparison user retention".

### 5.5 `ai_chat_user_retention`
- **Did:** `ai_chat_message`
- **Came back and did:** `page_viewed`
- Weekly, 8 weeks.
- Save as "AI chat user retention".

---

## 6. Boards (dashboards)

Mixpanel → **Boards** → **+ New Board**. Create six. For each:
- Name it exactly as the heading below.
- Description: copy the one-liner.
- For each chart: click **+ Add chart** in the Board, either pick a Saved Report (Funnels / Retention from sections 4 and 5) or build a new Insights / Flows chart inline.

### 6.1 Board: `01 — North Star`
Description: "The four numbers that matter. If these are healthy, everything else is cosmetic."

1. **WAU** — Insights → `page_viewed` → Unique users → Weekly resolution → last 30 days.
2. **Activation rate** — drop in the saved funnel `new_user_activation`.
3. **Week-2 retention** — drop in the saved retention `new_user_weekly`.
4. **Affiliate clicks per WAU** — Insights with formula: `A / B` where A = `tool_visit_clicked` (Total, last 7d) and B = `page_viewed` (Unique users, last 7d).

### 6.2 Board: `02 — Growth`
Description: "Top-of-funnel + signup throughput."

1. **Signups per day** — Insights → `signup_completed` → Total → Daily → last 30d. Filter `source = server` for authoritative count.
2. **Signup sources** — Insights → `signup_started` → Total → last 30d → Breakdown by `source`.
3. **First-touch UTM source** — Insights → `page_viewed` → Unique users → last 30d → Breakdown by `first_touch_utm_source`.
4. **Signup → activation funnel** — saved funnel `signup_activation`.
5. **At-risk cohort trend** — Insights → any event → Unique users, filter by cohort `At-risk users`, Daily, last 30d.

### 6.3 Board: `03 — Discovery`
Description: "How users find and pick tools."

1. **Top tools (last 30d)** — Insights → `tool_page_viewed` → Total → last 30d → Breakdown by `tool_slug`. Limit 20.
2. **Tool save rate** — Insights with formula: `tool_saved / tool_page_viewed`, last 30d.
3. **Empty search feed (weekly)** — Insights → `search_no_results` → Total → last 7d → Breakdown by `query`. Sort descending.
4. **Filter no-results** — Insights → `filter_no_results` → Total → last 30d → Breakdown by `filters`.
5. **Compare tray depth** — Insights → `comparison_viewed` → Total → last 30d → Breakdown by `count`.

### 6.4 Board: `04 — Revenue proxy`
Description: "Affiliate + upgrade intent. Pre-revenue, these are the best dollar proxies."

1. **Affiliate clicks — client vs server** — Insights → `tool_visit_clicked` → Total → last 30d → Breakdown by `source` (keep only `server` + client sources). The delta quantifies ad-blocker loss.
2. **Top affiliate earners** — Insights → `tool_visit_redirected` → Total → last 30d → Breakdown by `tool_slug`. Limit 20.
3. **Discovery funnel** — saved funnel `discovery_tool_visit`.
4. **Pricing → upgrade funnel** — saved funnel `monetization`.
5. **High-intent leavers cohort** — Insights → `page_viewed` → Unique users → filter by cohort `High-intent leavers`, Daily, last 30d.

### 6.5 Board: `05 — Content & SEO`
Description: "Blog / best / role page performance."

1. **Top blog posts** — Insights → `blog_post_viewed` → Total → last 30d → Breakdown by `slug`. Limit 20.
2. **Avg scroll depth /blog** — Insights → `scroll_depth_reached` → **Average of `depth`** → last 30d → filter `path` starts-with `/blog`.
3. **Time on page buckets** — Insights → `time_on_page` → Total → last 30d → Breakdown by `bucket`.
4. **Content → product funnel** — saved funnel `content_to_product`.
5. **/best and /for views** — Insights → `best_page_viewed` → Total → last 30d → Breakdown by `slug`. Add a second query for `role_page_viewed`.

### 6.6 Board: `06 — Quality`
Description: "Error rates, funnel leaks, empty searches — first place to look when numbers drop."

1. **Errors by boundary** — Insights → `error_encountered` → Total → last 7d → Breakdown by `boundary`.
2. **Empty search rate** — Insights formula: `search_no_results / search_query_submitted`, last 7d.
3. **Plan wizard drop-off** — saved funnel `plan_wizard`.
4. **Filter no-results trend** — Insights → `filter_no_results` → Total → Daily → last 30d.
5. **Perf markers (p95)** — Insights → `perf_mark` → **p95 of `duration_ms`** → last 7d → Breakdown by `marker`.

---

## 7. Alerts — tie Goals to notifications

Free tier allows email alerts on Goal thresholds. For every funnel in §4 that has an **Alert if below** value:

1. Open the funnel → **Goals** → open the goal → **Alerts** → **+ New Alert**.
2. Condition: "Goal is below X% of target" (where X is the alert threshold).
3. Window: rolling 3 days.
4. Recipient: `tanmayverma321@gmail.com`.
5. Save.

---

## 8. Verify the build

After everything is in place:

- Open **Board 01 — North Star**. All four charts should render without "no data" errors (you may need to wait 30–60 minutes for recent seed events to ingest + aggregate).
- Open **Reports → Funnels** → click each funnel. Every funnel should show ≥1 user at step 1 (assuming seed events).
- Open **Users → Cohorts** → every cohort should show a "last refreshed" timestamp and ≥0 users (0 is fine if no user matches yet).
- Open **Lexicon** → check that at least the core events (`page_viewed`, `tool_page_viewed`, `tool_visit_clicked`) have descriptions. If not, run `npm run mixpanel:lexicon` again or paste manually per §1.

---

## 9. Keeping this playbook in sync

Any time `scripts/mixpanel/config/*.ts` changes, update the matching section here and rerun the relevant steps in the UI. The code files are authoritative for future programmatic provisioning (post-upgrade or post-migration); this playbook is authoritative for the free-tier manual path. They must not drift.

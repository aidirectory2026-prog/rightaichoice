# Metrics & KPIs — What to Measure and How to Decide

## North Star Metric

### Monthly Active Decision-Makers (MADM)

**Definition:** Unique users who perform at least one *decision action* per month.

**Decision actions:**
- Generate a stack plan
- Use AI chat for recommendations
- Compare 2+ tools side-by-side
- Save a tool to their profile
- Write a review
- Ask or answer a question
- Click through to a tool's website

**Why this metric:** Pageviews and signups are vanity metrics. MADM measures whether people are actually using the platform to make decisions — which is our core value proposition.

**Targets:**
| Timeframe | MADM Target |
|---|---|
| Day 30 | 500 |
| Day 60 | 2,000 |
| Day 90 | 5,000 |
| Month 6 | 15,000 |
| Month 12 | 50,000 |

---

## KPI Framework — 4 Categories

### 1. Acquisition Metrics (Are people finding us?)

| Metric | Day 30 | Day 60 | Day 90 | Source |
|---|---|---|---|---|
| Monthly organic visits | 3,000 | 10,000 | 20,000-50,000 | Google Search Console |
| Pages indexed by Google | 200 | 500 | 700+ | GSC |
| Page 1 keywords | 10 | 30 | 50+ | GSC / Ahrefs |
| Page 2 keywords | 30 | 80 | 150+ | GSC / Ahrefs |
| Domain Authority | 10-15 | 15-20 | 20-25 | Moz / Ahrefs |
| Backlinks (total) | 15 | 35 | 50+ | Ahrefs / GSC |
| Referring domains | 10 | 25 | 40+ | Ahrefs |
| Newsletter subscribers | 200 | 600 | 1,000+ | Beehiiv |
| X/Twitter followers | 500 | 1,500 | 3,000+ | X Analytics |
| LinkedIn followers | 100 | 300 | 500+ | LinkedIn |
| Direct traffic (monthly) | 500 | 2,000 | 5,000+ | PostHog |
| Referral traffic (monthly) | 1,000 | 3,000 | 8,000+ | PostHog |

### 2. Engagement Metrics (Are people using the product?)

| Metric | Day 30 | Day 60 | Day 90 | Source |
|---|---|---|---|---|
| Stack plans generated | 200 | 1,000 | 3,000+ | Supabase / PostHog |
| AI chats initiated | 100 | 500 | 2,000+ | Supabase / PostHog |
| Tool comparisons made | 300 | 1,500 | 5,000+ | PostHog |
| Reviews written | 20 | 80 | 200+ | Supabase |
| Questions asked | 30 | 100 | 300+ | Supabase |
| Questions answered | 20 | 80 | 250+ | Supabase |
| Tools saved | 100 | 500 | 2,000+ | Supabase |
| Outbound clicks (to tool websites) | 500 | 2,000 | 8,000+ | PostHog |
| Avg. session duration | 2 min | 3 min | 3.5+ min | PostHog |
| Pages per session | 2.5 | 3.5 | 4+ | PostHog |
| Bounce rate | <65% | <55% | <50% | PostHog |

### 3. Retention Metrics (Are people coming back?)

| Metric | Target | Source |
|---|---|---|
| Week 1 return rate | 15%+ | PostHog cohorts |
| Month 1 return rate | 8%+ | PostHog cohorts |
| Newsletter open rate | 40%+ | Beehiiv |
| Newsletter click rate | 5%+ | Beehiiv |
| Repeat MADM (% of MADM who were MADM last month) | 30%+ | Supabase + PostHog |

### 4. SEO-Specific Metrics

| Metric | Target (Day 90) | How to Track |
|---|---|---|
| Total impressions (GSC) | 500K+/month | Google Search Console |
| Average CTR | 3%+ | Google Search Console |
| Top query positions | 10+ queries in top 3 | GSC |
| AEO citations | 5+ (Perplexity, ChatGPT) | Manual search checks |
| Best-of page avg. position | <15 | GSC by page |
| Comparison page avg. position | <20 | GSC by page |
| Tool detail page indexation | 95%+ | GSC coverage report |
| Core Web Vitals pass rate | 95%+ | GSC / PageSpeed Insights |

---

## Dashboard Setup

### Tool Stack (All Free)

| Tool | Purpose | Setup |
|---|---|---|
| **PostHog** (free tier) | Product analytics, funnels, cohorts, session replay | Already integrated |
| **Google Search Console** | SEO: impressions, clicks, positions, indexation | Verify domain |
| **Bing Webmaster Tools** | Bing/Perplexity indexing, AEO tracking | Verify domain |
| **Beehiiv** | Newsletter analytics: subs, opens, clicks | Built-in dashboard |
| **X Analytics** | Twitter impressions, follower growth, top tweets | Built into X |
| **Supabase Dashboard** | Database queries for engagement metrics | Already have access |

### Weekly Monday Review (30 minutes)

Every Monday morning, check these 10 numbers:

1. **Organic visits this week** (GSC) — trending up?
2. **New pages indexed** (GSC) — are new pages being picked up?
3. **MADM this week** (PostHog) — are people making decisions?
4. **Stack plans generated** (Supabase) — is the hero feature being used?
5. **New signups** (Supabase) — acquisition health
6. **Newsletter subscribers** (Beehiiv) — list growth
7. **Newsletter open rate** (Beehiiv) — content quality signal
8. **X/Twitter follower count** — social growth
9. **New reviews/Q&A** (Supabase) — community health
10. **Backlinks gained** (Ahrefs free check) — authority building

Log these in a simple spreadsheet to track trends over time.

### Monthly Deep Audit (2 hours)

First Monday of each month:

1. **SEO audit:**
   - Which pages are ranking? Which aren't? Why?
   - New keyword opportunities from GSC data
   - Content gap analysis: queries with impressions but low CTR (improve meta descriptions)
   - Technical issues: crawl errors, mobile usability, Core Web Vitals

2. **Content audit:**
   - Which blog posts got the most traffic?
   - Which social posts got the most engagement?
   - Which Reddit posts drove the most signups?
   - Content ROI: hours invested vs traffic/signups generated

3. **Channel audit:**
   - Traffic by source: organic, social, referral, direct, newsletter
   - Signups by source (UTM tracking)
   - MADM by acquisition source (which channel brings the highest-quality users?)

4. **Community audit:**
   - Review volume and quality trend
   - Q&A activity trend
   - Are community contributions increasing month-over-month?

---

## Decision Framework — What to Do When Metrics Are Off

### If organic traffic is flat or declining:
```
Check → Are new pages being indexed?
  Yes → Pages aren't ranking. Improve content quality, add internal links, build more backlinks.
  No → Technical SEO issue. Check GSC for crawl errors, robots.txt, sitemap.

Check → Are existing pages losing position?
  Yes → Content freshness issue. Update pages with new data. Check if competitors published better content.
  No → Need more pages. Accelerate programmatic SEO expansion.
```

### If engagement is low (visitors but no actions):
```
Check → Which pages have high traffic but low engagement?
  Tool pages → Improve CTAs. Add "Compare this tool" and "Build a stack" prompts more prominently.
  Best-of pages → Add "Generate your custom stack" CTA after the list.
  Blog posts → Add inline tool cards and comparison links within content.

Check → Is the stack planner being found?
  No → Make it more prominent. Add to navigation, homepage hero, every page sidebar.
  Yes but low completion → Simplify the input. Reduce friction. Test different prompts.
```

### If retention is low (people don't come back):
```
Check → Newsletter open rate?
  Below 30% → Subject lines are weak. A/B test. Consider different send times.
  Above 40% but low return → Newsletter isn't driving re-engagement. Add more personalized tool recommendations.

Check → Are saved tools / stacks being created?
  No → No reason to come back. Implement email notifications: "New tools in your saved categories" or "Your saved tool was updated."
  Yes → People save but don't return. Send email reminders. Add browser push notifications.
```

### If social isn't working:
```
Check → Which platform is underperforming?
  X/Twitter → Are you posting consistently? Are threads getting engagement? If not, try different formats. If yes but no follows, improve bio/pinned tweet.
  Reddit → Are posts getting removed? Check sub rules. Are comments getting upvotes? If not, provide more value, less promotion.
  LinkedIn → Are you using the right format? Carousels >> text posts on LinkedIn. Are you posting in the right time window?

Fallback → If social across all channels isn't working after 4 weeks of consistent effort:
  → Shift 100% of social time to Reddit answer engagement (highest guaranteed ROI)
  → Focus entirely on SEO (doesn't require social traction)
```

### If newsletter isn't growing:
```
Check → Where are subscribers coming from?
  Mostly blog → Add more signup CTAs on high-traffic pages
  Mostly stack planner → The gate-behind-email strategy is working. Promote stack planner more.
  Very few from any source → Make the value proposition clearer. "Get the best AI tool recommendation every Tuesday" vs generic "Subscribe to our newsletter"

Check → Is content good enough to be shared?
  Ask: Would you forward this to a friend?
  No → Improve content. More unique data, better curation, stronger opinions.
  Yes → Add "Forward to a friend" CTA. Enable Beehiiv referral program.
```

---

## Metrics NOT to Track (Vanity Metrics)

| Don't Obsess Over | Why |
|---|---|
| Total pageviews | Inflated by bots, doesn't indicate value |
| Total registered users | Signups ≠ engaged users. MADM matters more. |
| Social followers (alone) | 10K followers with 0 site visits = useless |
| Time on page (alone) | Could mean engaged OR confused |
| Number of tools listed | 500 curated tools > 5,000 thin listings |
| Number of blog posts | 8 great posts > 30 mediocre ones |

---

## Reporting Cadence

| Report | Frequency | Audience | Format |
|---|---|---|---|
| Quick health check | Daily | You | 2-min dashboard glance |
| Weekly review | Monday | You | 10 metrics in spreadsheet |
| Monthly audit | First Monday | You + stakeholders | Written summary + action items |
| Quarterly strategy review | Every 90 days | You + advisors | Full analysis + next 90-day plan |

---

## Attribution Setup (Critical for Decision-Making)

### UTM Parameters
Every outbound link from social, newsletter, and outreach should have UTM parameters:

```
?utm_source=[platform]&utm_medium=[type]&utm_campaign=[campaign]

Examples:
- X/Twitter thread → ?utm_source=twitter&utm_medium=social&utm_campaign=stack-thread-april
- Newsletter → ?utm_source=beehiiv&utm_medium=email&utm_campaign=issue-3
- Reddit post → ?utm_source=reddit&utm_medium=social&utm_campaign=ai-writing-comparison
- Tool creator email → ?utm_source=email&utm_medium=outreach&utm_campaign=creator-notify-batch1
- Product Hunt → ?utm_source=producthunt&utm_medium=launch&utm_campaign=ph-launch-day
```

### PostHog Event Tracking
Ensure these custom events fire:

| Event | Trigger | Properties |
|---|---|---|
| `stack_generated` | User completes stack plan | goal, tool_count, total_cost |
| `tool_compared` | User opens comparison view | tool_slugs |
| `tool_saved` | User saves a tool | tool_slug |
| `review_submitted` | User writes a review | tool_slug, rating |
| `question_asked` | User asks a question | tool_slug |
| `outbound_click` | User clicks to tool website | tool_slug, destination_url |
| `ai_chat_initiated` | User starts AI chat | query_text |
| `newsletter_signup` | User subscribes | source_page |
| `share_stack` | User shares a stack plan | platform (twitter/linkedin) |

These events power the MADM calculation and all engagement metrics.

# Viral Mechanics — Built-In Growth Loops

## Philosophy

The best marketing doesn't feel like marketing. It's a feature so useful that sharing it IS the natural behavior.

Our viral strategy is built around **shareable outputs** — things users create on the platform that they naturally want to show others. Every share brings new users who create their own shareable outputs. Flywheel.

---

## Viral Loop #1: Shareable Stack Plans (Highest Potential)

### Why This Is Our #1 Viral Mechanic
- No competitor offers goal-to-stack planning
- People LOVE sharing "my stack" posts on X/Twitter and Reddit
- Every shared stack is a mini-ad for the platform with real utility
- The output is inherently valuable to the viewer (they learn about tools AND the platform)

### How It Works
```
User describes goal → Stack planner generates result
→ "Share your stack" button → Branded image/link
→ Shared on X/Reddit/LinkedIn → New users see it
→ They try the stack planner → They share their stack
→ Repeat
```

### Implementation

#### Branded OG Images
Auto-generate a branded card for every stack plan result:

```
┌──────────────────────────────────────────┐
│  🎯 AI Stack for: Launch a SaaS Product  │
│                                          │
│  Research    → Perplexity     $0/mo      │
│  Writing     → Claude         $20/mo     │
│  Design      → Midjourney     $10/mo     │
│  Code        → Cursor         $20/mo     │
│  Deploy      → Vercel         $0/mo      │
│  Analytics   → PostHog        $0/mo      │
│                                          │
│  Total: $50/mo                           │
│                                          │
│  Generated with RightAIChoice.com        │
└──────────────────────────────────────────┘
```

**Technical approach:**
- Generate with `@vercel/og` (Satori) — already available in Vercel
- Create API route: `/api/og/stack?goal=...&tools=...`
- Set as `og:image` meta tag on the shareable stack URL
- When shared on X/LinkedIn, the card auto-renders

#### Pre-Formatted Share Copy
One-click share buttons with pre-populated text:

**X/Twitter:**
```
My AI stack for [goal]:

[Tool 1] → [task] ($X/mo)
[Tool 2] → [task] ($X/mo)
[Tool 3] → [task] ($X/mo)

Total: $XX/mo

Build yours → rightaichoice.com/stack-planner
```

**LinkedIn:**
```
Just mapped out my complete AI stack for [goal].

[Stack details]

Total monthly cost: $XX

Generated with RightAIChoice — it asks your goal and recommends the exact tools + costs.

What does your AI stack look like?
```

#### Shareable URL
Every stack plan gets a permanent URL:
`rightaichoice.com/stacks/generated/[unique-id]`

The page shows:
- The goal
- The complete stack with tools, reasoning, and costs
- "Generate your own stack" CTA (prominent)
- Links to each tool's detail page

---

## Viral Loop #2: Comparison Social Cards

### How It Works
Every comparison page (`rightaichoice.com/compare/chatgpt-vs-claude`) generates a rich OG image showing the comparison table.

When someone shares a comparison link on social media, the preview card shows:

```
┌──────────────────────────────────────────┐
│  ChatGPT vs Claude — Full Comparison     │
│                                          │
│  Feature    │ ChatGPT    │ Claude        │
│  ──────────────────────────────────────  │
│  Rating     │ ⭐ 4.7     │ ⭐ 4.8       │
│  Price      │ $20/mo     │ $20/mo       │
│  Best For   │ General    │ Long-form    │
│  Code       │ ★★★★☆     │ ★★★★★       │
│                                          │
│  Full comparison at RightAIChoice.com    │
└──────────────────────────────────────────┘
```

**Why this works:** People constantly debate "ChatGPT vs Claude" on social media. A visual comparison card is the perfect content to drop into those conversations.

---

## Viral Loop #3: "Listed on RightAIChoice" Badge

### The Concept
Offer embeddable badges to every AI tool creator whose tool is listed on the platform:

```html
<a href="https://rightaichoice.com/tools/your-tool">
  <img src="https://rightaichoice.com/badge/your-tool.svg" 
       alt="Listed on RightAIChoice — AI Tool Reviews" />
</a>
```

### Why This Is Brilliant
- **500+ potential backlinks** from tool creator websites
- Each badge links back to the tool's page on our platform
- Tool creators WANT this — it's social proof that their tool is recognized
- Every badge is a permanent advertisement on their site
- Backlinks from 500+ tool websites massively boosts our domain authority

### Badge Design (3 options)
1. **Simple:** "Listed on RightAIChoice" — clean, minimal
2. **With rating:** "Rated 4.7/5 on RightAIChoice" — only for tools with reviews
3. **Category winner:** "Top AI [Category] Tool — RightAIChoice" — for top-rated in category

### Rollout
1. Email tool creators: "Your tool is listed on RightAIChoice. Here's your badge to embed on your site."
2. Include badge HTML in the email (make it effortless)
3. Create a "claim your page" flow where creators verify ownership and get badge options
4. Track which badges are embedded (referrer logs)

---

## Viral Loop #4: Trend-Riding System

### The Concept
When a new AI tool launches (on Product Hunt, X/Twitter, or via news), we:
1. Add it to the platform within 24 hours
2. Publish a comparison page (new tool vs top existing alternative)
3. Post the comparison on X/Twitter + Reddit

### Why This Works
- New tool launches create massive search spikes
- People immediately search "[new tool] vs [existing tool]"
- If we're the first with a structured comparison, we capture that traffic
- The comparison post on social rides the hype wave

### Process
```
New tool launches (detected via PH RSS, X monitoring, news)
→ Add to platform (use ingest pipeline or manual)
→ Generate comparison page (vs top alternative)
→ Post on X: "[New Tool] just launched. Here's how it compares to [Alternative]"
→ Post on Reddit: answer threads asking about the new tool
→ Capture search traffic: "[new tool] vs [alternative]"
```

### Monitoring Sources
- Product Hunt daily launches (automated via RSS)
- X/Twitter AI accounts (manual check, 2x/day)
- r/artificial, r/ChatGPT new posts (daily)
- Hacker News front page (daily)
- AI newsletters (weekly)

**Time investment:** 15-30 minutes/day to monitor + 30-60 minutes to add tool + publish comparison.

**Expected frequency:** 2-3 trend-rides per week (not every launch is worth riding).

---

## Viral Loop #5: "What's Your AI Stack?" Quiz

### The Concept
A fun, interactive quiz that takes 60 seconds to complete and generates a personalized AI stack recommendation. The output is a shareable image with your "AI personality type" and recommended stack.

### Quiz Flow
```
Question 1: What's your primary role?
  → Developer / Creator / Marketer / Business Owner / Student / Other

Question 2: What's your biggest AI goal right now?
  → Write better content / Build products faster / Automate tasks / Learn new skills / Create visual content

Question 3: What's your budget for AI tools?
  → Free only / Under $50/mo / Under $200/mo / Whatever it takes

Question 4: How technical are you?
  → Beginner / Intermediate / Expert / "I use ChatGPT, that's it"

Question 5: What do you value most?
  → Speed / Quality / Cost / Ease of use / Customization
```

### Output
A branded result card:

```
┌──────────────────────────────────────────┐
│  Your AI Persona: The Efficient Creator  │
│                                          │
│  Your Recommended Stack:                 │
│  ✍️ Writing: Claude ($20/mo)             │
│  🎨 Design: Canva AI (Free)             │
│  📊 Analytics: PostHog (Free)            │
│  🤖 Automation: Zapier ($20/mo)          │
│                                          │
│  Total: $40/mo                           │
│  Match Score: 94%                        │
│                                          │
│  Take the quiz → rightaichoice.com/quiz  │
└──────────────────────────────────────────┘
```

### Why Quizzes Go Viral
- **Highest share rate** of any content format (people love sharing personality-type results)
- Self-expression: "Here's MY stack" is inherently personal and shareable
- Low effort for user: 60 seconds vs exploring the full platform
- Result page converts: "Want more details? View full recommendations →"
- Every share brings new quiz-takers

### Implementation Notes
- Client-side quiz (no login required — reduce friction)
- Result maps quiz answers to stack planner categories
- Generate OG image for the result page (shareable)
- "Share on X/LinkedIn" buttons with pre-populated copy
- Track quiz completions and shares in analytics

---

## Viral Loop #6: Simple Referral Mechanic

### The Concept
Low-friction referral system focused on recognition, not rewards.

### How It Works
1. Every user gets a referral link: `rightaichoice.com/?ref=username`
2. When someone signs up via the referral link, the referrer gets:
   - "Community Champion" badge on their profile
   - Referral count visible on profile (social proof)
   - Name on a "Community Champions" page
3. Top referrers featured in the weekly newsletter

### Why Recognition > Rewards
- Rewards (discounts, cash) attract referral gamers, not genuine users
- Recognition (badges, leaderboards) attracts community builders
- Recognition is free to implement and maintain
- Aligns with rule-book: no fake engagement systems

### Implementation
- Add `referred_by` column to users table
- Track via URL parameter on signup
- Badge system already exists (from reputation system) — add "Community Champion" badge
- Monthly "Top Community Champions" post on X/Twitter

---

## Viral Coefficient Targets

| Loop | Expected Viral Coefficient | Timeline to Impact |
|---|---|---|
| Stack plan sharing | 0.3-0.5 (every 3 shares = 1 new user) | Immediate |
| Comparison social cards | 0.1-0.2 | 2-4 weeks |
| Tool creator badges | 0.05-0.1 (slow but permanent) | 1-3 months |
| Trend-riding | 0.2-0.4 (spiky) | Per event |
| Quiz | 0.4-0.8 (if it catches on) | 2-4 weeks after launch |
| Referral | 0.1-0.2 | Ongoing |

**Combined viral coefficient target: 0.5-0.8** (meaning every 2 users bring 1 new user organically). This doesn't achieve self-sustaining virality (>1.0) but dramatically reduces acquisition cost and compounds with SEO.

---

## Priority Order (by effort/impact ratio)

1. **Stack plan sharing** — Already have the stack planner. Just need OG image generation + share buttons. Highest impact for lowest effort.
2. **Trend-riding** — No code needed. Just operational discipline to add tools fast + post comparisons.
3. **Comparison social cards** — OG image generation for comparison pages. Similar to stack sharing.
4. **Tool creator badges** — Create SVG badge template + email outreach. Medium effort, massive long-term impact.
5. **Referral mechanic** — Simple to implement, moderate ongoing impact.
6. **Quiz** — Highest development effort but potentially highest viral coefficient. Build after proving other loops work.

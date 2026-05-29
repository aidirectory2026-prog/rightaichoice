-- Step 42 editorial compare: claude-code-vs-cursor
-- Split from 041_seed_comparisons_editorial.sql for safe paste.

-- 3) Claude Code vs Cursor — terminal agent vs AI IDE
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$claude-code$body0$),
    (SELECT id FROM tools WHERE slug = $body1$cursor$body1$)
  ],
  $body2$claude-code-vs-cursor$body2$,
  $body3$[
    {"dimension":"Best for","values":{"claude-code":"Agent-driven, multi-file work in large codebases","cursor":"IDE-first coding with sub-second tab completion"}},
    {"dimension":"Interface","values":{"claude-code":"Terminal / CLI","cursor":"Fork of VS Code"}},
    {"dimension":"Pricing floor","values":{"claude-code":"$20/mo (Claude Pro)","cursor":"Free Hobby tier · $20/mo Pro"}},
    {"dimension":"Context window (practical)","values":{"claude-code":"Up to ~1M on Max/Enterprise","cursor":"~70–120k on Pro"}},
    {"dimension":"Model routing","values":{"claude-code":"Anthropic models (Sonnet/Opus 4.7)","cursor":"Claude, GPT-5, Gemini, Composer"}},
    {"dimension":"Autocomplete","values":{"claude-code":"None — agent-only","cursor":"Industry-leading sub-second Tab"}},
    {"dimension":"Subagents","values":{"claude-code":"Native, nestable, hook-driven","cursor":"Single-level background agents"}}
  ]$body3$::jsonb,
  $body4$Pick Claude Code if you spend most of your time in the terminal and your work involves multi-file refactors, security audits, or long-context reasoning — its subagent model and ~1M-token context are a durable advantage. Pick Cursor if you live in an IDE, value sub-second tab completion, and want one tool that routes across Claude, GPT-5, and Gemini without leaving the editor.$body4$,
  $body5$These are the two most used AI coding tools in 2026, and the debate between them is not "which is better" — it is "which one fits how you work." They optimise for fundamentally different human-in-the-loop shapes.

**Claude Code** is a terminal agent. You run it in your shell, describe a task, and it reads files, edits them, runs commands, and reports back. There is no editor surface — when it opens a file, it does so in your actual editor (VS Code, Neovim, JetBrains) because you opened the terminal there. Claude Code's mental model is 'assistant you delegate to,' not 'autocomplete that finishes your line.' Under the hood it uses Anthropic's Sonnet and Opus models with extended tool use, sub-agents that spawn on demand for isolated tasks, and lifecycle hooks that fire on events like 'before edit' or 'on task complete.'

**Cursor** is a fork of VS Code with AI deeply integrated. The autocomplete (Tab) predicts multi-line edits as you type and is genuinely fast — sub-second response is the norm. Cmd-K pops an inline edit prompt. Composer (Cursor's agent mode) runs multi-file tasks in a side panel. Cursor routes between Claude, GPT-5, Gemini, and its own Composer model depending on the task; the Composer model is reportedly ~4x faster than similar-capability frontier models, which shows up in interactive editing.

**The capability gap that actually matters**

On pure single-task, single-file work — "add validation to this function," "refactor this component to use the new API" — they are roughly equal. The editor surface in Cursor is faster for that loop because you see the change in your code, accept or reject inline, and keep typing.

On multi-file, multi-step work, Claude Code pulls ahead in two ways. First, context. Cursor's effective context window on Pro is around 70–120k tokens in practice (even on models that nominally support more, Cursor caps what it sends for latency and cost reasons). Claude Code on Max or Enterprise plans sends up to ~1M tokens per run. On a 400-file codebase where an accurate refactor needs to see half of them, this is the difference between the agent landing the change and fabricating references that do not exist.

Second, subagents. Claude Code lets a parent agent spawn child agents that run in parallel, each with its own context, pre-approved permissions, and dedicated output channel. Parents can orchestrate; children can do isolated research or edits. Cursor has background agents but they are single-level — no nested spawning, no lifecycle hooks. For a task like 'audit all authentication code across this monorepo,' Claude Code can spawn five subagents in parallel, each analysing a different service, then the parent synthesises. Cursor would do this sequentially.

**Where Cursor wins cleanly**

Tab completion is not even close. Cursor's multi-line Tab prediction is the industry benchmark in April 2026. It is the feature that makes day-to-day typing meaningfully faster and has no equivalent in Claude Code. If you write a lot of new code from scratch (greenfield features, prototypes, exploring a new library), this compounds.

Model routing in one UI is nice. Cursor lets you send the same prompt to Claude and GPT-5 and compare — useful for tricky bugs where model diversity helps. Claude Code is Anthropic-only by design.

The free Hobby tier is a real on-ramp. Cursor lets individual developers try agent mode and autocomplete at zero cost. Claude Code requires at minimum a $20/month Claude Pro subscription.

**Where Claude Code's depth shows up**

For a codebase over a quarter million lines, for week-long refactors, for security audits that need to reason across services, for migration work where you need the agent to understand enough of the system to make coherent decisions — Claude Code's context and subagent architecture do more than Cursor's Composer. This is not theoretical. On multi-file SWE-bench variants and internal agent benchmarks, Claude Code with Opus 4.7 lands tasks in fewer iterations than Cursor's best config.

**When to use both**

The most productive setup for many senior engineers is to use both. Cursor for daily coding — autocomplete, small edits, chat while you type. Claude Code in a second terminal for the big stuff — refactors, audits, migrations, multi-service work that needs deep context and parallel subagent exploration. The $20/month overlap is trivial next to the time savings.$body5$,
  $body6$**Claude Code** requires a Claude subscription. The floor is Claude Pro at $20/month, which gives you Claude Code access with rate limits that most solo developers hit only occasionally. The Max plan ($100/month or $200/month depending on tier) removes most limits and bumps context to ~1M tokens, which is where heavy Claude Code users live. Enterprise adds SSO, audit logs, and centralised billing. Anthropic announced Claude Opus 4.7 on April 16, 2026, available on all paid plans. There is no pay-per-token Claude Code path for individuals — it is subscription or nothing.

**Cursor** has a free Hobby tier with limited agent requests and unlimited basic completions, a $20/month Pro tier that is the default for working developers, and a $40/month Business tier with team management. Enterprise is custom. Cursor switched to a quota-based pricing model in March 2026 (away from credits), which made costs more predictable. Heavy Cursor users sometimes hit the Pro quota by mid-month and upgrade to Ultra at $100/month — similar economics to Claude Max.

Hidden costs to know: Cursor's agent mode with frontier models consumes quota faster than tab completions; a developer using Composer for most work will hit Pro limits around week two of the month. Claude Code's Max plan is technically unlimited but Anthropic applies soft throttling on sustained high usage, which can feel opaque. For team billing, Cursor Business is simpler (per-seat, clear admin) than Claude Max Enterprise (contract-based, more setup).

If you are deciding which single tool to pay for: at $20/month both deliver real value for most developers. The decision is workflow, not price. If you are already paying for Claude for other work, Claude Code is effectively free to add.$body6$,
  $body7$[
    {"persona":"Solo developer writing new code daily","recommendedSlug":"cursor","reasoning":"Cursor's Tab autocomplete alone saves 20–40 minutes a day for developers writing fresh code. The IDE-first workflow fits how most hands-on coding actually happens."},
    {"persona":"Staff engineer doing multi-service refactors","recommendedSlug":"claude-code","reasoning":"Claude Code's ~1M-token context and subagent orchestration handle cross-repo, cross-service reasoning in ways Cursor cannot match. For week-long refactors, the depth gap is the difference."},
    {"persona":"Security engineer doing code audits","recommendedSlug":"claude-code","reasoning":"Subagents running in parallel across services plus long context make systematic audits tractable. Cursor Composer runs single-threaded and caps context well below what a real audit needs."},
    {"persona":"Developer who wants one subscription to try multiple models","recommendedSlug":"cursor","reasoning":"Cursor routes between Claude, GPT-5, Gemini, and Composer from one UI. Claude Code is Anthropic-only. If you want to A/B models on hard bugs, Cursor is the better single-tool choice."},
    {"persona":"Team standardising tooling across 20+ developers","recommendedSlug":"cursor","reasoning":"Cursor Business has cleaner per-seat billing, team policies, and IDE-standard workflow. Claude Code Enterprise works but requires more setup and less-mature admin tooling as of Q2 2026."}
  ]$body7$::jsonb,
  $body8$[
    {"dimension":"SWE-bench Verified (best config)","values":{"claude-code":{"score":"80.8","unit":"%","source":"Anthropic benchmarks, Sonnet 4.6 + Claude Code harness"},"cursor":{"score":"~75","unit":"%","source":"Cursor published, Composer 2"}}},
    {"dimension":"Effective context window","values":{"claude-code":{"score":"~1M","unit":"tokens (Max)","source":"Anthropic plan docs"},"cursor":{"score":"70–120k","unit":"tokens (Pro)","source":"Cursor docs + community testing"}}},
    {"dimension":"Tab completion latency","values":{"claude-code":{"score":"N/A","unit":"","source":"no autocomplete feature"},"cursor":{"score":"<500","unit":"ms","source":"Cursor benchmarks"}}},
    {"dimension":"Subagent nesting","values":{"claude-code":{"score":"Multi-level","unit":"","source":"docs: nested subagents + hooks"},"cursor":{"score":"Single-level","unit":"","source":"background agents, no nesting"}}},
    {"dimension":"Base price","values":{"claude-code":{"score":"$20","unit":"/mo (Claude Pro)","source":"Anthropic pricing"},"cursor":{"score":"$0 / $20","unit":"/mo Hobby / Pro","source":"cursor.com/pricing"}}},
    {"dimension":"Models available","values":{"claude-code":{"score":"Sonnet 4.6, Opus 4.7","unit":"","source":"Anthropic only"},"cursor":{"score":"Claude + GPT-5 + Gemini + Composer","unit":"","source":"multi-provider routing"}}}
  ]$body8$::jsonb,
  $body9$[
    {"question":"Can Claude Code replace Cursor?","answer":"For agent-driven work, yes. For daily typing with tab completion, no — Claude Code has no autocomplete by design. Many senior developers run both: Cursor for the editor loop, Claude Code in a terminal for deeper tasks."},
    {"question":"Does Cursor use Claude models?","answer":"Yes. Cursor routes to Claude Sonnet 4.6 and Opus 4.7 alongside GPT-5, Gemini, and its own Composer model. You choose the model per request or let Cursor auto-route. The same underlying models are available, but the harness around them (context limits, agent loop, tool access) differs from Claude Code."},
    {"question":"Which is better for large codebases?","answer":"Claude Code. Its ~1M-token context on Max/Enterprise plans and parallel subagent execution handle 400k+ line codebases in ways Cursor's capped context cannot. On a monorepo audit or cross-service refactor, Claude Code will land the work in fewer iterations."},
    {"question":"Is Claude Code free?","answer":"No, there is no free tier. It requires at minimum Claude Pro at $20/month. Anthropic does not expose a free Claude Code path for individuals as of April 2026. Cursor by contrast has a free Hobby tier for evaluation."},
    {"question":"Can I use Claude Code inside Cursor?","answer":"Not directly, but you can open Cursor's integrated terminal and run Claude Code from there. The two tools coexist cleanly — Cursor edits files; Claude Code reads and edits those same files via the terminal. Git keeps them in sync."},
    {"question":"Which has better privacy for sensitive code?","answer":"Both run on cloud inference (Anthropic for Claude Code, mixed providers for Cursor). Neither is suitable for air-gapped environments. Enterprise plans on both sides offer zero-retention policies and SOC 2 / HIPAA coverage. If code must stay on-premises, neither works — use a local-model setup like Aider + Ollama instead."},
    {"question":"Is Cursor's Composer model better than Claude?","answer":"Different tradeoff. Cursor's Composer is optimised for latency (roughly 4x faster than similarly capable frontier models) with slightly lower raw capability. On interactive editing, that speed wins. On hard multi-step reasoning, Claude Sonnet or Opus wins. Cursor lets you pick per task."}
  ]$body9$::jsonb,
  true,
  $body10$2026-04-21T00:00:00Z$body10$,
  $body11$2026-04-21T00:00:00Z$body11$,
  0
) ON CONFLICT (slug) DO NOTHING;

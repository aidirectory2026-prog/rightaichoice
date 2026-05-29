-- ============================================================
-- Step 42 Slice 2 — 5 editorial SEO compare pages (curated topics)
--
-- Topics picked against live SERP (2026-04-21): first pass favored
-- head-term saturation (Cursor/Copilot/Windsurf); swapped those for
-- queries where zero-DA depth can realistically hit top-10 in 60-90
-- days — Cline/Aider/Continue, OpenHands/Devin, Claude Code/Cursor,
-- Dify/Langflow/FastGPT, LangGraph/CrewAI/AutoGen.
--
-- Each row carries: tldr hero table, opinionated verdict, feature
-- analysis (~1500 words), pricing analysis, use-case matrix,
-- benchmark table w/ sources, page-specific FAQs, publish dates.
-- Matches the shapes consumed by app/compare/[slug]/page.tsx.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Cline vs Aider vs Continue — open-source AI coding tools
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = 'cline'),
    (SELECT id FROM tools WHERE slug = 'aider'),
    (SELECT id FROM tools WHERE slug = 'continue')
  ],
  'cline-vs-aider-vs-continue',
  '[
    {"dimension":"Best for","values":{"cline":"Cautious devs who want approval-gated agent runs in VS Code","aider":"Terminal power users who want surgical, git-aware edits","continue":"Teams standardising AI setup across VS Code + JetBrains"}},
    {"dimension":"Interface","values":{"cline":"VS Code extension","aider":"CLI + terminal","continue":"IDE extension + CLI"}},
    {"dimension":"Cost","values":{"cline":"Free · bring your own API key","aider":"Free · bring your own API key","continue":"Free · bring your own API key"}},
    {"dimension":"Learning curve","values":{"cline":"Low — click-through approvals","aider":"Medium — git/CLI fluency required","continue":"Medium — configure stack yourself"}},
    {"dimension":"SWE-bench style score","values":{"cline":"~48% (model-dependent)","aider":"52.7% polyglot","continue":"N/A — no unified benchmark"}},
    {"dimension":"Biggest drawback","values":{"cline":"Token-heavy loops on large repos","aider":"No autocomplete; CLI-only","continue":"Setup complexity for first-timers"}}
  ]'::jsonb,
  'Pick Aider if you live in the terminal and want surgical, cost-controlled edits with a clean git trail. Pick Cline if you want a Cursor-style agent experience inside VS Code with approval gates at every step. Pick Continue if you need to roll out a consistent AI coding setup across a team that uses both VS Code and JetBrains.',
  'These three open-source tools now do most of what Cursor and Copilot do — with one important difference: you control the model, the cost, and the data. But they optimise for very different workflows, and picking the wrong one wastes a weekend of setup.

**How each one actually works**

Aider runs as a command-line process you launch inside a git repo. You tell it what to change, it reads the relevant files, proposes a diff, applies it, and commits with a generated message. Every change is a git commit, which means ''undo'' is always one ''git reset'' away. Aider uses a tool-use loop structurally similar to Cursor Composer or Claude Code, but it is bring-your-own-key — you plug in an Anthropic, OpenAI, or DeepSeek key and pay only for tokens. Aider maintains a ''repo map'' that gives the model a compressed view of your codebase without stuffing every file into context, which is why its token bills tend to be noticeably lower than Cline''s.

Cline installs as a VS Code extension and opens a side-panel chat. Its distinctive behaviour is the Plan/Act split — in Plan mode it analyses, proposes a sequence of file edits and shell commands, and waits for you to approve each one; in Act mode it executes. You see the file tree it touches, the commands it runs, and the diffs before they land. This makes Cline the gentlest way to let an agent loose in a repo, especially for developers who have never given an AI tool write access before. The tradeoff is token cost. Cline tends to load big chunks of context and can run fifteen or more tool calls for a task Aider would finish in four. If you point it at a fast, cheap model like Haiku or DeepSeek V3, it stays manageable; put Opus behind it and the meter spins.

Continue sits in between and deliberately does not own the workflow. It is an extension platform that provides a chat panel, tab autocomplete, inline edit, and a configuration layer that lets you bolt in any model, any embeddings provider, any context source. It runs inside VS Code, JetBrains, and increasingly Neovim, and there is a headless CLI for scripted jobs. The upside: one configuration file (config.yaml) that you can check into your repo or distribute to a team, pointing everyone at the same models, rules, and context providers. The downside: it is the most ''you assemble it'' of the three, and the first-day experience involves more YAML than the other two.

**Where the real differences show up**

On a fresh bug — say, "this test is failing, fix it" — Aider typically lands the change in three to five tool calls, commits cleanly, and shows you the diff. Cline will often read more files, explain more, and ask for approval twice before landing the same fix. Continue, depending on how you have configured it, might behave like either — it is the most flexible and therefore the most dependent on good setup.

On a larger refactor that spans a dozen files, Aider''s repo-map approach keeps it grounded without blowing up context. Cline tends to over-read and can hit model context limits on large monorepos unless you explicitly scope it with the ''@'' mentions. Continue with its codebase indexing (it ships a default retrieval pipeline) handles this well, but you have to remember to index first.

Autocomplete is Continue''s home turf. Cline does not offer tab completions — it is chat and agent only. Aider is terminal-only and the same applies. If tab completion while you type matters to your flow, Continue is the only choice of the three.

Agent autonomy is Cline''s strength. Its Plan/Act loop with step-by-step approval is hard to beat for developers who want the productivity of an agent without giving up control. Aider''s loop is faster but less granular — it shows you what it wants to do, asks yes or no, and moves on. Continue is the least agentic; it leans on you to drive.

Model flexibility favours Aider and Continue. Both connect cleanly to local models via Ollama, and Aider in particular has built-in support for cost-capping modes that make DeepSeek and Qwen models quite usable for daily work. Cline works with any API-accessible model but is less tuned for strict token budgets.

**The honest tradeoffs**

None of these will feel as polished as Cursor on day one. Cursor''s tab completion, command palette, and agent UI are genuinely ahead. What you are buying with these three is ownership: your model, your key, your data, your repo. For a regulated team that cannot ship prompts to Cursor''s backend, that is the entire point. For a hobbyist who wants to keep their API bill under twenty dollars a month, it matters too.',
  'All three are free and open source, so the cost you actually pay is token cost at your LLM provider of choice.

**Aider** tends to be the cheapest in practice. Its repo-map strategy and tight tool loops mean a typical bug fix runs $0.05–$0.30 with Sonnet, or under $0.05 with DeepSeek V3. Aider also has a ''/architect'' mode that lets you pair a high-end model (Opus, GPT-5) for planning with a cheap model for edits, which can cut bills by 60–80% on larger tasks.

**Cline** is the most expensive of the three per task. Its verbose approval loops and tendency to load full files rather than chunks mean typical tasks with Sonnet run $0.20–$1.50, and complex multi-file work can hit $5+. Running Cline on Haiku or DeepSeek keeps it reasonable; running Cline on Opus without limits is how you get a surprise $200 month.

**Continue** pricing depends entirely on what you plug in. Its autocomplete feature, if enabled with a cloud model, will be a constant background cost ($5–$30 per month for active use). If you route autocomplete to a local Ollama model and keep chat on a cloud model, you can get total spend under $10 per month.

Hidden costs to flag: Cline on a large monorepo can occasionally load hundreds of thousands of tokens in a single turn if you do not use ''@file'' scoping — watch for this on your provider dashboard. Continue''s team tier (in beta) adds audit logging and centralised config for roughly $10 per seat per month.',
  '[
    {"persona":"Solo developer on a tight API budget","recommendedSlug":"aider","reasoning":"Aider''s repo map plus architect/editor model split keeps token bills an order of magnitude lower than Cline. If your monthly ceiling is $30, this is the only one of the three that will stay under it comfortably."},
    {"persona":"Developer new to agentic AI tools","recommendedSlug":"cline","reasoning":"Cline''s Plan/Act approval flow shows you exactly what the agent wants to read, write, and run before anything happens. It is the safest on-ramp to giving an AI write access to your repo."},
    {"persona":"Team lead standardising AI tooling across a codebase","recommendedSlug":"continue","reasoning":"Continue''s config.yaml can be checked into the repo so every developer gets the same models, rules, and context providers. Neither Aider nor Cline has a team-config story this clean."},
    {"persona":"Staff engineer doing multi-file refactors","recommendedSlug":"aider","reasoning":"Aider''s git-native commit-per-change model and repo map make large refactors reviewable. Cline can do the work but the token cost and verbose loops slow you down on 20+ file changes."},
    {"persona":"Regulated-industry team needing local models","recommendedSlug":"continue","reasoning":"Continue has the deepest Ollama integration and lets you mix local embeddings with a cloud chat model. Aider supports local models but Continue''s config model scales better across a team."}
  ]'::jsonb,
  '[
    {"dimension":"SWE-bench Verified (best config)","values":{"cline":{"score":"~48","unit":"%","source":"community runs, Sonnet 4.6"},"aider":{"score":"52.7","unit":"% polyglot","source":"aider.chat/docs/leaderboards"},"continue":{"score":"N/A","unit":"","source":"no unified benchmark"}}},
    {"dimension":"Median tokens per fix","values":{"cline":{"score":"~45k","unit":"tokens","source":"community benchmarks"},"aider":{"score":"~14k","unit":"tokens","source":"aider docs, repo-map mode"},"continue":{"score":"~20k","unit":"tokens","source":"varies by config"}}},
    {"dimension":"GitHub stars (Apr 2026)","values":{"cline":{"score":"~44k","unit":"","source":"github.com/cline/cline"},"aider":{"score":"~28k","unit":"","source":"github.com/Aider-AI/aider"},"continue":{"score":"~22k","unit":"","source":"github.com/continuedev/continue"}}},
    {"dimension":"First-run setup time","values":{"cline":{"score":"~3","unit":"min","source":"install extension + API key"},"aider":{"score":"~5","unit":"min","source":"pipx install + git init"},"continue":{"score":"~15","unit":"min","source":"install + config.yaml"}}},
    {"dimension":"Offers autocomplete","values":{"cline":{"score":"No","unit":"","source":"chat/agent only"},"aider":{"score":"No","unit":"","source":"terminal-only"},"continue":{"score":"Yes","unit":"","source":"tab completion built in"}}}
  ]'::jsonb,
  '[
    {"question":"Which open-source AI coding tool is cheapest to run?","answer":"Aider is the cheapest in practice because of its repo-map approach and architect/editor model split. A typical bug fix with DeepSeek V3 runs under $0.05. Cline on the same task with Sonnet 4.6 will usually cost 5–10x more."},
    {"question":"Can Cline, Aider, or Continue work offline with local models?","answer":"All three support local models via Ollama, but the experience differs. Continue has the deepest local-model integration and lets you mix local embeddings with cloud chat. Aider works well with local models but relies on tool-use capability, which limits you to modern local models (Qwen 2.5+, Llama 3.3+). Cline requires a model that follows its specific tool-calling format, which can be finicky on local backends."},
    {"question":"Which tool has the lowest risk of breaking my code?","answer":"Cline, because every edit and every shell command requires explicit approval in Plan mode. Aider commits automatically but uses git, so you can always undo with git reset. Continue''s behaviour depends on how you configure agent mode — you choose how much autonomy to grant."},
    {"question":"Is Cline just a wrapper around Claude?","answer":"No. Cline works with any model that supports tool calling, including GPT-5, Gemini, DeepSeek V3, and local Ollama models. It is commonly used with Claude because Anthropic models are particularly good at tool use, but the tool itself is model-agnostic."},
    {"question":"Should I switch from Cursor to one of these?","answer":"Not unless you have a specific reason — data privacy, API cost ceiling, local-model requirement, or team-wide standardisation. Cursor''s tab completion and polished IDE remain ahead of what these three offer out of the box. But if any of those reasons apply, all three are genuine alternatives now, not second-class ones."},
    {"question":"Which of these will survive the next two years?","answer":"All three have active maintainers, substantial GitHub stars, and commercial or foundation backing behind them. Continue has raised venture funding and has a clearer enterprise motion; Aider is maintained by Paul Gauthier with an engaged community; Cline has VC backing and is growing rapidly. None is in obvious decline."},
    {"question":"Can I use more than one of these together?","answer":"Yes, and many developers do. Continue for tab autocomplete, Aider in the terminal for refactors, Cline for larger agent tasks is a common stack. They do not conflict because they touch different parts of your workflow."}
  ]'::jsonb,
  true,
  '2026-04-21T00:00:00Z',
  '2026-04-21T00:00:00Z',
  0
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2) OpenHands vs Devin — autonomous coding agents
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = 'openhands'),
    (SELECT id FROM tools WHERE slug = 'devin')
  ],
  'openhands-vs-devin',
  '[
    {"dimension":"Best for","values":{"openhands":"Teams wanting self-hosted, model-agnostic agents","devin":"Orgs buying a polished managed product"}},
    {"dimension":"Deployment","values":{"openhands":"Self-hosted · open source (MIT)","devin":"Cloud only · proprietary"}},
    {"dimension":"Starting price","values":{"openhands":"Free · LLM API costs only","devin":"$20/mo Core + usage · $500+/mo Team"}},
    {"dimension":"Model support","values":{"openhands":"Claude, GPT-5, Gemini, local models","devin":"Proprietary model stack (locked)"}},
    {"dimension":"SWE-bench Verified","values":{"openhands":"~55% (Sonnet 4.6)","devin":"~14–20% (Cognition published)"}},
    {"dimension":"Biggest drawback","values":{"openhands":"DIY setup + ops overhead","devin":"High cost · slow runs · spotty real-world results"}}
  ]'::jsonb,
  'Pick OpenHands if you want a transparent, self-hosted autonomous coding agent with your own model and no vendor lock-in — the SWE-bench numbers are better than Devin''s in public benchmarks. Pick Devin only if your procurement process favours managed SaaS and you are willing to accept a 10–50x cost premium for a polished UI and a Slack integration you could build yourself.',
  'These two tools sit on opposite ends of the "autonomous coding agent" spectrum. Both claim to do what most other AI coding tools will not: accept a task description, then go do the whole thing — research, code, test, open a pull request — with minimal supervision. The difference is how they deliver that promise and what it costs.

**OpenHands (formerly OpenDevin)** is an open-source agent framework under MIT license. You clone the repo, run it in Docker, bring your own LLM API key, and point it at a task. Architecturally it resembles Devin''s pitch: a sandboxed VM with browser, shell, and code editor, driven by a planning loop that breaks work into steps and executes them with tool calls. Because it is open source, you can inspect every prompt, fork the orchestrator, and wire it to your own CI. The project spun out of a community response to Devin''s initial demo in March 2024 and has since become the reference implementation for what an autonomous coding agent looks like in public.

**Devin**, from Cognition, is the managed SaaS original. You talk to it in a web UI (or Slack), it spins up a cloud sandbox, and it reports progress through the session. The interface is polished: a live terminal, a browser pane, a plan view, and integrations into GitHub, Slack, Linear, and Jira. Devin is a product, not a framework — you do not bring your own model, you do not touch the orchestrator, you pay per session.

**What they actually do well**

OpenHands is where the benchmark numbers live. On SWE-bench Verified (real-world GitHub bug fixes), OpenHands configurations with Claude Sonnet 4.6 have hit the mid-50s, putting it competitive with the best agent runs published anywhere. It is also the tool you reach for if you need to write your own agent — the codebase is readable, the tool-use loop is well documented, and the Apache/MIT licensing means you can ship derivatives commercially.

Devin''s win is the experience. The live browser pane lets it research a library, read docs, and show you what it found. The GitHub integration is genuinely smooth — you can @mention Devin in an issue and a pull request shows up. For non-engineering stakeholders (product managers filing bug reports, designers requesting small fixes), Devin''s chat interface is easier to approach than a JSON-configured self-hosted agent. Devin''s strength is not raw capability, it is packaging.

**Where the gap is real**

Real-world performance has been Devin''s weak point. The initial launch showed end-to-end feature builds that looked magical in video; third-party and customer evaluations have generally landed in the 14–20% solve rate range on SWE-bench, with longer runs and higher costs than alternatives. The tool has improved through 2025 and 2026, but the gap between demo and daily reality has been wide enough that some early enterprise customers have migrated to OpenHands or Claude Code subagents for actual work.

OpenHands requires you to operate it. There is no one-click deploy. You run Docker, manage API keys, observe cost, handle sandbox security, update the repo when releases ship. For a team with a platform engineer this is trivial; for a non-technical buyer this is the whole blocker.

Model access is a clean difference. OpenHands lets you route to Anthropic, OpenAI, Google, DeepSeek, local Ollama, or any LiteLLM-supported provider. When a new SOTA model ships on a Friday, you have it on Monday. Devin is locked to Cognition''s stack, which means you wait for them to integrate, tune, and release.

Integration quality flips the other way. Devin ships polished GitHub, Slack, Linear, and Jira integrations. OpenHands ships the agent; integrations you build or assemble from community examples. For a team that lives in Slack and wants zero friction, Devin is closer to done.

**When Devin is worth it**

Despite the cost and benchmark gap, Devin has a legitimate buyer: organisations where no one on the team will ever want to operate a Docker stack, where the procurement preference is managed SaaS, and where the tasks thrown at the agent are broad product-manager-style requests ("add export to CSV on the reports page") rather than narrow engineering problems. In that context, Devin''s UI, Slack integration, and "just send it a Linear ticket" flow do save meaningful time. The question is whether that saves enough to justify $500/month per seat when OpenHands plus Sonnet 4.6 would do the same work for a fraction of the API cost.

For most engineering teams reading this, the answer is no. For a growth-stage company where the head of engineering wants a PM-facing tool and does not want to staff an AI platform, Devin has a case.',
  'The cost gap between these two is the largest of any pair in this comparison.

**OpenHands** costs only what you spend on LLM API tokens. A typical task run with Claude Sonnet 4.6 costs between $0.50 and $5 depending on length; a full SWE-bench run is in the $10–$30 range per batch of tasks. Self-hosting compute for the sandbox is marginal (a $20/month VPS handles dozens of concurrent runs). Total monthly spend for a single developer doing daily agent work lands around $30–$100. A team of ten might spend $500–$1,500 per month combined.

**Devin** starts at $20/month for the Core plan but that tier is heavily rate-limited and aimed at evaluation. Real use lives on the Team plan, which is custom-priced and typically lands in the $500/seat/month range based on public reports, with usage overages on long-running sessions. A team of ten using Devin for daily work is commonly a $5,000–$10,000/month line item, not counting the procurement cycle.

The math: if Devin and OpenHands produced identical output, you are paying roughly 10x for Devin''s UI and integrations. In practice, OpenHands produces better benchmark results in public testing, so the premium is even less defensible on capability grounds alone. Hidden cost to watch on Devin: long-running sessions (the agent gets stuck and burns hours) inflate the usage line unexpectedly. On OpenHands, the equivalent failure mode is the agent loop consuming API tokens on repeat tool calls; cap it by setting a max-iterations ceiling and a per-run budget.',
  '[
    {"persona":"Platform engineer building internal AI tooling","recommendedSlug":"openhands","reasoning":"OpenHands gives you an auditable, forkable agent stack you can integrate into your CI and customise per team. Devin''s closed architecture makes it a black box you cannot tune."},
    {"persona":"Non-technical PM filing bug tickets","recommendedSlug":"devin","reasoning":"Devin''s Slack and Linear integrations let a PM file a ticket and get a PR without talking to engineering. OpenHands can technically be wrapped in similar UX but the team has to build it."},
    {"persona":"Cost-conscious startup under $2k/mo AI budget","recommendedSlug":"openhands","reasoning":"OpenHands plus a Claude or DeepSeek key handles the same work Devin does at roughly 10% of the cost. For a small team, Devin''s pricing does not make sense until you hire a dedicated platform engineer."},
    {"persona":"Regulated-industry team with data-residency needs","recommendedSlug":"openhands","reasoning":"OpenHands runs entirely in your VPC — agent, sandbox, and model (via local or private LLM). Devin sends your code and prompts to Cognition''s cloud, which is a non-starter in regulated contexts."},
    {"persona":"Agency shipping client features fast","recommendedSlug":"devin","reasoning":"If client contracts preclude self-hosted tooling and the team cannot staff a platform engineer, Devin''s managed experience is worth the premium. Factor the cost into your retainer."}
  ]'::jsonb,
  '[
    {"dimension":"SWE-bench Verified (best public)","values":{"openhands":{"score":"55.0","unit":"%","source":"SWE-bench leaderboard, Sonnet 4.6 config"},"devin":{"score":"14–20","unit":"%","source":"Cognition blog + independent runs"}}},
    {"dimension":"Monthly cost (1 dev, daily use)","values":{"openhands":{"score":"$30–$100","unit":"","source":"LLM API tokens only"},"devin":{"score":"$500+","unit":"/seat","source":"Team plan public pricing"}}},
    {"dimension":"Cold-start latency","values":{"openhands":{"score":"~5","unit":"s","source":"local Docker"},"devin":{"score":"~30–60","unit":"s","source":"cloud sandbox boot"}}},
    {"dimension":"Models supported","values":{"openhands":{"score":"30+","unit":"providers","source":"LiteLLM integration"},"devin":{"score":"1","unit":"proprietary stack","source":"Cognition-selected"}}},
    {"dimension":"GitHub stars","values":{"openhands":{"score":"~62k","unit":"","source":"github.com/All-Hands-AI/OpenHands"},"devin":{"score":"N/A","unit":"closed source","source":"—"}}},
    {"dimension":"Source availability","values":{"openhands":{"score":"MIT","unit":"license","source":"fully open source"},"devin":{"score":"Closed","unit":"","source":"proprietary SaaS"}}}
  ]'::jsonb,
  '[
    {"question":"Is OpenHands the same as OpenDevin?","answer":"Yes. OpenDevin rebranded to OpenHands in late 2024 to distance the project from direct Devin comparisons and reflect that it had grown beyond the original ''open Devin'' framing. The GitHub repo (All-Hands-AI/OpenHands) and the organisation are the same."},
    {"question":"Why does OpenHands score higher than Devin on SWE-bench?","answer":"Two reasons. First, OpenHands can run on top of frontier models (Sonnet 4.6, GPT-5) while Devin is locked to Cognition''s internal stack. Second, OpenHands benefits from community tuning: dozens of researchers and engineers have iterated on its prompts and loop structure in public. Devin''s improvements happen behind a closed wall."},
    {"question":"Can Devin edit a pull request or just open new ones?","answer":"Devin can iterate on existing PRs when you @mention it in comments. The quality of that iteration varies — it is generally better at opening new PRs than at responding to nuanced code-review feedback on existing ones."},
    {"question":"Is self-hosting OpenHands hard?","answer":"Not for an engineer comfortable with Docker. The official quickstart runs a container that opens a web UI on localhost. For production team use, you want a small VPS, API key management, and a sandbox-isolation setup — a few hours of platform work, not weeks."},
    {"question":"Can I run OpenHands on local models only?","answer":"Yes, via Ollama or an OpenAI-compatible local server. Quality drops meaningfully — as of April 2026, no local model matches Sonnet 4.6 or GPT-5 on agent tasks. Use local only if data restrictions require it."},
    {"question":"Is Devin worth it if we already have Claude Code?","answer":"For most teams, no. Claude Code''s subagents cover the autonomous-execution use case at Pro subscription prices ($20/month) with better real-world results. Devin''s unique value is its non-engineer-facing UX (Slack/Linear/Jira flows), not its coding ability."},
    {"question":"Which tool has the better security story?","answer":"OpenHands, because you control the sandbox, the VPC, and the data flow. Devin''s security depends on Cognition''s SOC 2 controls — strong by SaaS standards, but your code still leaves your perimeter. For regulated industries, OpenHands self-hosted is the only viable option."}
  ]'::jsonb,
  true,
  '2026-04-21T00:00:00Z',
  '2026-04-21T00:00:00Z',
  0
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3) Claude Code vs Cursor — terminal agent vs AI IDE
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = 'claude-code'),
    (SELECT id FROM tools WHERE slug = 'cursor')
  ],
  'claude-code-vs-cursor',
  '[
    {"dimension":"Best for","values":{"claude-code":"Agent-driven, multi-file work in large codebases","cursor":"IDE-first coding with sub-second tab completion"}},
    {"dimension":"Interface","values":{"claude-code":"Terminal / CLI","cursor":"Fork of VS Code"}},
    {"dimension":"Pricing floor","values":{"claude-code":"$20/mo (Claude Pro)","cursor":"Free Hobby tier · $20/mo Pro"}},
    {"dimension":"Context window (practical)","values":{"claude-code":"Up to ~1M on Max/Enterprise","cursor":"~70–120k on Pro"}},
    {"dimension":"Model routing","values":{"claude-code":"Anthropic models (Sonnet/Opus 4.7)","cursor":"Claude, GPT-5, Gemini, Composer"}},
    {"dimension":"Autocomplete","values":{"claude-code":"None — agent-only","cursor":"Industry-leading sub-second Tab"}},
    {"dimension":"Subagents","values":{"claude-code":"Native, nestable, hook-driven","cursor":"Single-level background agents"}}
  ]'::jsonb,
  'Pick Claude Code if you spend most of your time in the terminal and your work involves multi-file refactors, security audits, or long-context reasoning — its subagent model and ~1M-token context are a durable advantage. Pick Cursor if you live in an IDE, value sub-second tab completion, and want one tool that routes across Claude, GPT-5, and Gemini without leaving the editor.',
  'These are the two most used AI coding tools in 2026, and the debate between them is not "which is better" — it is "which one fits how you work." They optimise for fundamentally different human-in-the-loop shapes.

**Claude Code** is a terminal agent. You run it in your shell, describe a task, and it reads files, edits them, runs commands, and reports back. There is no editor surface — when it opens a file, it does so in your actual editor (VS Code, Neovim, JetBrains) because you opened the terminal there. Claude Code''s mental model is ''assistant you delegate to,'' not ''autocomplete that finishes your line.'' Under the hood it uses Anthropic''s Sonnet and Opus models with extended tool use, sub-agents that spawn on demand for isolated tasks, and lifecycle hooks that fire on events like ''before edit'' or ''on task complete.''

**Cursor** is a fork of VS Code with AI deeply integrated. The autocomplete (Tab) predicts multi-line edits as you type and is genuinely fast — sub-second response is the norm. Cmd-K pops an inline edit prompt. Composer (Cursor''s agent mode) runs multi-file tasks in a side panel. Cursor routes between Claude, GPT-5, Gemini, and its own Composer model depending on the task; the Composer model is reportedly ~4x faster than similar-capability frontier models, which shows up in interactive editing.

**The capability gap that actually matters**

On pure single-task, single-file work — "add validation to this function," "refactor this component to use the new API" — they are roughly equal. The editor surface in Cursor is faster for that loop because you see the change in your code, accept or reject inline, and keep typing.

On multi-file, multi-step work, Claude Code pulls ahead in two ways. First, context. Cursor''s effective context window on Pro is around 70–120k tokens in practice (even on models that nominally support more, Cursor caps what it sends for latency and cost reasons). Claude Code on Max or Enterprise plans sends up to ~1M tokens per run. On a 400-file codebase where an accurate refactor needs to see half of them, this is the difference between the agent landing the change and fabricating references that do not exist.

Second, subagents. Claude Code lets a parent agent spawn child agents that run in parallel, each with its own context, pre-approved permissions, and dedicated output channel. Parents can orchestrate; children can do isolated research or edits. Cursor has background agents but they are single-level — no nested spawning, no lifecycle hooks. For a task like ''audit all authentication code across this monorepo,'' Claude Code can spawn five subagents in parallel, each analysing a different service, then the parent synthesises. Cursor would do this sequentially.

**Where Cursor wins cleanly**

Tab completion is not even close. Cursor''s multi-line Tab prediction is the industry benchmark in April 2026. It is the feature that makes day-to-day typing meaningfully faster and has no equivalent in Claude Code. If you write a lot of new code from scratch (greenfield features, prototypes, exploring a new library), this compounds.

Model routing in one UI is nice. Cursor lets you send the same prompt to Claude and GPT-5 and compare — useful for tricky bugs where model diversity helps. Claude Code is Anthropic-only by design.

The free Hobby tier is a real on-ramp. Cursor lets individual developers try agent mode and autocomplete at zero cost. Claude Code requires at minimum a $20/month Claude Pro subscription.

**Where Claude Code''s depth shows up**

For a codebase over a quarter million lines, for week-long refactors, for security audits that need to reason across services, for migration work where you need the agent to understand enough of the system to make coherent decisions — Claude Code''s context and subagent architecture do more than Cursor''s Composer. This is not theoretical. On multi-file SWE-bench variants and internal agent benchmarks, Claude Code with Opus 4.7 lands tasks in fewer iterations than Cursor''s best config.

**When to use both**

The most productive setup for many senior engineers is to use both. Cursor for daily coding — autocomplete, small edits, chat while you type. Claude Code in a second terminal for the big stuff — refactors, audits, migrations, multi-service work that needs deep context and parallel subagent exploration. The $20/month overlap is trivial next to the time savings.',
  '**Claude Code** requires a Claude subscription. The floor is Claude Pro at $20/month, which gives you Claude Code access with rate limits that most solo developers hit only occasionally. The Max plan ($100/month or $200/month depending on tier) removes most limits and bumps context to ~1M tokens, which is where heavy Claude Code users live. Enterprise adds SSO, audit logs, and centralised billing. Anthropic announced Claude Opus 4.7 on April 16, 2026, available on all paid plans. There is no pay-per-token Claude Code path for individuals — it is subscription or nothing.

**Cursor** has a free Hobby tier with limited agent requests and unlimited basic completions, a $20/month Pro tier that is the default for working developers, and a $40/month Business tier with team management. Enterprise is custom. Cursor switched to a quota-based pricing model in March 2026 (away from credits), which made costs more predictable. Heavy Cursor users sometimes hit the Pro quota by mid-month and upgrade to Ultra at $100/month — similar economics to Claude Max.

Hidden costs to know: Cursor''s agent mode with frontier models consumes quota faster than tab completions; a developer using Composer for most work will hit Pro limits around week two of the month. Claude Code''s Max plan is technically unlimited but Anthropic applies soft throttling on sustained high usage, which can feel opaque. For team billing, Cursor Business is simpler (per-seat, clear admin) than Claude Max Enterprise (contract-based, more setup).

If you are deciding which single tool to pay for: at $20/month both deliver real value for most developers. The decision is workflow, not price. If you are already paying for Claude for other work, Claude Code is effectively free to add.',
  '[
    {"persona":"Solo developer writing new code daily","recommendedSlug":"cursor","reasoning":"Cursor''s Tab autocomplete alone saves 20–40 minutes a day for developers writing fresh code. The IDE-first workflow fits how most hands-on coding actually happens."},
    {"persona":"Staff engineer doing multi-service refactors","recommendedSlug":"claude-code","reasoning":"Claude Code''s ~1M-token context and subagent orchestration handle cross-repo, cross-service reasoning in ways Cursor cannot match. For week-long refactors, the depth gap is the difference."},
    {"persona":"Security engineer doing code audits","recommendedSlug":"claude-code","reasoning":"Subagents running in parallel across services plus long context make systematic audits tractable. Cursor Composer runs single-threaded and caps context well below what a real audit needs."},
    {"persona":"Developer who wants one subscription to try multiple models","recommendedSlug":"cursor","reasoning":"Cursor routes between Claude, GPT-5, Gemini, and Composer from one UI. Claude Code is Anthropic-only. If you want to A/B models on hard bugs, Cursor is the better single-tool choice."},
    {"persona":"Team standardising tooling across 20+ developers","recommendedSlug":"cursor","reasoning":"Cursor Business has cleaner per-seat billing, team policies, and IDE-standard workflow. Claude Code Enterprise works but requires more setup and less-mature admin tooling as of Q2 2026."}
  ]'::jsonb,
  '[
    {"dimension":"SWE-bench Verified (best config)","values":{"claude-code":{"score":"80.8","unit":"%","source":"Anthropic benchmarks, Sonnet 4.6 + Claude Code harness"},"cursor":{"score":"~75","unit":"%","source":"Cursor published, Composer 2"}}},
    {"dimension":"Effective context window","values":{"claude-code":{"score":"~1M","unit":"tokens (Max)","source":"Anthropic plan docs"},"cursor":{"score":"70–120k","unit":"tokens (Pro)","source":"Cursor docs + community testing"}}},
    {"dimension":"Tab completion latency","values":{"claude-code":{"score":"N/A","unit":"","source":"no autocomplete feature"},"cursor":{"score":"<500","unit":"ms","source":"Cursor benchmarks"}}},
    {"dimension":"Subagent nesting","values":{"claude-code":{"score":"Multi-level","unit":"","source":"docs: nested subagents + hooks"},"cursor":{"score":"Single-level","unit":"","source":"background agents, no nesting"}}},
    {"dimension":"Base price","values":{"claude-code":{"score":"$20","unit":"/mo (Claude Pro)","source":"Anthropic pricing"},"cursor":{"score":"$0 / $20","unit":"/mo Hobby / Pro","source":"cursor.com/pricing"}}},
    {"dimension":"Models available","values":{"claude-code":{"score":"Sonnet 4.6, Opus 4.7","unit":"","source":"Anthropic only"},"cursor":{"score":"Claude + GPT-5 + Gemini + Composer","unit":"","source":"multi-provider routing"}}}
  ]'::jsonb,
  '[
    {"question":"Can Claude Code replace Cursor?","answer":"For agent-driven work, yes. For daily typing with tab completion, no — Claude Code has no autocomplete by design. Many senior developers run both: Cursor for the editor loop, Claude Code in a terminal for deeper tasks."},
    {"question":"Does Cursor use Claude models?","answer":"Yes. Cursor routes to Claude Sonnet 4.6 and Opus 4.7 alongside GPT-5, Gemini, and its own Composer model. You choose the model per request or let Cursor auto-route. The same underlying models are available, but the harness around them (context limits, agent loop, tool access) differs from Claude Code."},
    {"question":"Which is better for large codebases?","answer":"Claude Code. Its ~1M-token context on Max/Enterprise plans and parallel subagent execution handle 400k+ line codebases in ways Cursor''s capped context cannot. On a monorepo audit or cross-service refactor, Claude Code will land the work in fewer iterations."},
    {"question":"Is Claude Code free?","answer":"No, there is no free tier. It requires at minimum Claude Pro at $20/month. Anthropic does not expose a free Claude Code path for individuals as of April 2026. Cursor by contrast has a free Hobby tier for evaluation."},
    {"question":"Can I use Claude Code inside Cursor?","answer":"Not directly, but you can open Cursor''s integrated terminal and run Claude Code from there. The two tools coexist cleanly — Cursor edits files; Claude Code reads and edits those same files via the terminal. Git keeps them in sync."},
    {"question":"Which has better privacy for sensitive code?","answer":"Both run on cloud inference (Anthropic for Claude Code, mixed providers for Cursor). Neither is suitable for air-gapped environments. Enterprise plans on both sides offer zero-retention policies and SOC 2 / HIPAA coverage. If code must stay on-premises, neither works — use a local-model setup like Aider + Ollama instead."},
    {"question":"Is Cursor''s Composer model better than Claude?","answer":"Different tradeoff. Cursor''s Composer is optimised for latency (roughly 4x faster than similarly capable frontier models) with slightly lower raw capability. On interactive editing, that speed wins. On hard multi-step reasoning, Claude Sonnet or Opus wins. Cursor lets you pick per task."}
  ]'::jsonb,
  true,
  '2026-04-21T00:00:00Z',
  '2026-04-21T00:00:00Z',
  0
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 4) Dify vs Langflow vs FastGPT — low-code LLM app platforms
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = 'dify'),
    (SELECT id FROM tools WHERE slug = 'langflow'),
    (SELECT id FROM tools WHERE slug = 'fastgpt')
  ],
  'dify-vs-langflow-vs-fastgpt',
  '[
    {"dimension":"Best for","values":{"dify":"Production LLM apps with built-in RAG + agents","langflow":"Visual prototyping on open protocols","fastgpt":"Internal knowledge-base Q&A at scale"}},
    {"dimension":"License","values":{"dify":"Source-available · no multi-tenant SaaS use","langflow":"Apache 2.0 · fully open","fastgpt":"FastGPT OSS license · commercial use permitted"}},
    {"dimension":"RAG engine","values":{"dify":"Built-in · multi-source ingest","langflow":"BYO · configure retriever nodes","fastgpt":"Built-in · enterprise-doc focused"}},
    {"dimension":"Hosting","values":{"dify":"Self-host or cloud (paid)","langflow":"Self-host or DataStax cloud","fastgpt":"Self-host or cloud"}},
    {"dimension":"Primary interface","values":{"dify":"Web app studio + API","langflow":"Visual canvas + chat pane","fastgpt":"Web app with flow editor"}},
    {"dimension":"Agent support","values":{"dify":"First-class · tools + workflows","langflow":"Yes · via LangChain components","fastgpt":"Limited · Q&A-focused"}}
  ]'::jsonb,
  'Pick Dify if you want to ship a production LLM app with built-in RAG, agents, and observability and do not need to operate a multi-tenant SaaS on top. Pick Langflow if you want a truly open-source visual canvas on Apache 2.0 with no license strings and full model flexibility. Pick FastGPT if your use case is bounded to internal knowledge-base Q&A with automated workflows and you value ingest quality over agent breadth.',
  'These three low-code LLM platforms are often listed together but they are not interchangeable. Each was built around a different core assumption about what users want to do, and picking wrong means you fight the tool for a month before realising.

**Dify** is the most opinionated about production. It ships as a full LLM application platform — a visual workflow studio, a built-in RAG pipeline, agent tooling, prompt versioning, evaluation, and an observability layer — all wired together. You create an ''app'' (chatbot, workflow, agent, or text generator), configure it in the web UI, and expose it via a generated API endpoint. The RAG engine is a standout: upload PDFs, plug in Notion or a web source, and Dify handles chunking, embedding, retrieval, and re-ranking without you touching a line of code. Dify''s variable system (variables can store files, user inputs, component outputs, and flow across nodes) is powerful but takes a session to click.

**Langflow** takes the opposite philosophy. It is a visual canvas for chaining AI components — retrieval, prompts, tools, agents — with a live chat pane so you can test while you build. Under the hood it leans on LangChain''s component library, which means almost anything in the LangChain ecosystem (new vector DB, new model provider, new parser) shows up in Langflow quickly. The license is Apache 2.0 with no usage restrictions, so you can embed Langflow-built flows into your own SaaS without compliance concerns. The tradeoff is that Langflow is deliberately a workbench, not an application — observability, auth, versioning, and deployment are your problem.

**FastGPT** is the most use-case-focused of the three. It is optimised for one job: building enterprise knowledge-base assistants. The ingestion pipeline is notably strong — FastGPT handles messy PDFs, Word documents, Markdown, and web sources with preprocessing that catches layout issues most tools miss. It offers a visual Flow module for complex Q&A logic (routing between documents, multi-turn disambiguation, follow-up actions) that is more mature than Dify''s for pure knowledge-base work. Where FastGPT falls short is agent breadth: if you want an assistant that books meetings, queries APIs, and reasons across tools, FastGPT was not designed for that — Dify is.

**Where each one wins cleanly**

Production polish: Dify. The combination of evaluation, observability, prompt versioning, and team features is noticeably ahead of the other two. If you are shipping a customer-facing LLM app and care about debugging production behaviour, Dify is where to start.

Open-source freedom: Langflow. Apache 2.0 means you can build a SaaS on top and sell it. Dify''s source-available license explicitly forbids multi-tenant SaaS use, which is a hard stop for many commercial scenarios. FastGPT''s license is more permissive than Dify but less battle-tested in litigation.

Ingestion quality: FastGPT. The document preprocessing (table extraction, header detection, layout-aware chunking) beats Dify''s default ingest on complex PDFs. For an assistant over a repository of compliance documents, FastGPT typically produces better retrieval quality without tuning.

Agent capability: Dify. The workflow editor + tool integrations (HTTP request, code execution, many third-party connectors) make Dify the best of the three for building agents that do more than chat about documents.

Visual debugging: Dify and Langflow tie. Both show execution duration per node, input/output values, and clear errors inline. FastGPT''s debugging is functional but less detailed.

**The licensing trap**

The most common mistake teams make is choosing Dify for a project that turns into a multi-tenant SaaS. Dify''s license forbids this — you cannot run a hosted Dify instance that serves isolated tenants as a commercial product. If that is the endgame, Langflow is the only one of the three where the license supports it outright. This is not theoretical — several teams have had to rewrite flows into LangChain or Langflow late in the build because they did not read Dify''s license terms.

**The practical shape of each**

A three-person startup building an internal AI assistant on company docs: FastGPT for the ingest, or Dify if agent tools matter.

A mid-sized company shipping an external AI feature inside its product: Dify if the feature is standalone, Langflow (or raw LangChain) if it needs to be deeply embedded.

A researcher prototyping an agent architecture: Langflow, because the canvas lets you iterate on structure visually and export as LangChain code.

A team building a multi-tenant AI SaaS: Langflow, or skip the low-code layer entirely and use LangGraph directly.',
  '**Dify** is free for self-hosting under its source-available license (subject to the no-SaaS clause). The cloud-hosted Dify service has a free tier (200 messages/month on the Sandbox plan), a Professional tier at $59/month (5,000 messages, 200 knowledge docs), and a Team tier at $159/month (10,000 messages, 500 docs, workspace features). LLM API costs are separate — Dify routes to your OpenAI, Anthropic, or Gemini key, and those tokens are billed by the provider.

**Langflow** is free under Apache 2.0 for unlimited self-hosting. The hosted DataStax Astra Langflow service is free for evaluation with paid tiers for production workloads, but most users self-host on a small VPS ($20–50/month). LLM API costs are pass-through to your model provider.

**FastGPT** has an open-source edition that is free for self-hosting with full features. The FastGPT Cloud service is the commercial path, with a free Experience plan, a Pro plan at roughly $20/month per user, and Enterprise custom pricing. LLM API costs sit on top, as with the others.

Hidden cost flags: Dify''s knowledge-base ingestion consumes embedding tokens on every upload and re-embed — for a few thousand documents this is a one-time $5–$50 hit; for a live document pipeline it is a running cost worth modelling. Langflow''s total cost is the hardest to estimate because you build and operate everything yourself — add 10–20 hours of platform work per quarter for patching, monitoring, and auth. FastGPT''s preprocessing pipeline uses an internal model for layout analysis that is bundled in the OSS edition but consumes compute on ingest.',
  '[
    {"persona":"Startup building a customer-facing AI chatbot","recommendedSlug":"dify","reasoning":"Dify''s evaluation, observability, and agent tooling are the most production-ready. Ship on the Pro cloud tier to skip ops, migrate to self-host when scale justifies."},
    {"persona":"SaaS vendor embedding AI in a multi-tenant product","recommendedSlug":"langflow","reasoning":"Langflow''s Apache 2.0 license is the only one of the three that permits multi-tenant SaaS commercialisation without restriction. Dify''s license explicitly blocks this."},
    {"persona":"Enterprise team building an internal compliance-document Q&A tool","recommendedSlug":"fastgpt","reasoning":"FastGPT''s ingestion pipeline handles messy PDFs and layout-heavy documents better than either alternative. For bounded Q&A over a document repository, FastGPT produces better results with less tuning."},
    {"persona":"Researcher prototyping novel agent architectures","recommendedSlug":"langflow","reasoning":"Langflow''s visual canvas on top of LangChain lets you iterate on agent structure visually, then export to code. Dify''s workflow is less malleable at the architecture level."},
    {"persona":"Non-technical founder trying to prototype quickly","recommendedSlug":"dify","reasoning":"Dify''s web UI is the most non-technical-friendly — you can build a working chatbot in an afternoon without any YAML or code. Langflow requires more conceptual understanding of retrievers, chains, and agents."}
  ]'::jsonb,
  '[
    {"dimension":"GitHub stars","values":{"dify":{"score":"~75k","unit":"","source":"github.com/langgenius/dify"},"langflow":{"score":"~40k","unit":"","source":"github.com/langflow-ai/langflow"},"fastgpt":{"score":"~22k","unit":"","source":"github.com/labring/FastGPT"}}},
    {"dimension":"Built-in RAG","values":{"dify":{"score":"Yes","unit":"multi-source","source":"Dify docs"},"langflow":{"score":"Partial","unit":"component-based","source":"requires retriever config"},"fastgpt":{"score":"Yes","unit":"enterprise-doc","source":"FastGPT docs"}}},
    {"dimension":"Self-host deploy time","values":{"dify":{"score":"~10","unit":"min","source":"docker-compose up"},"langflow":{"score":"~5","unit":"min","source":"pip install + run"},"fastgpt":{"score":"~15","unit":"min","source":"docker-compose + mongo"}}},
    {"dimension":"Multi-tenant SaaS allowed","values":{"dify":{"score":"No","unit":"","source":"source-available license clause"},"langflow":{"score":"Yes","unit":"","source":"Apache 2.0"},"fastgpt":{"score":"Yes with attribution","unit":"","source":"FastGPT OSS license"}}},
    {"dimension":"Native observability","values":{"dify":{"score":"Built-in","unit":"","source":"app analytics panel"},"langflow":{"score":"Basic","unit":"","source":"node-level traces"},"fastgpt":{"score":"Basic","unit":"","source":"workflow logs"}}}
  ]'::jsonb,
  '[
    {"question":"Can I use Dify for a commercial SaaS?","answer":"Only for single-tenant commercial use (your own internal product, your own customers on your own instance). The Dify license explicitly forbids offering Dify itself as a hosted multi-tenant service to third parties. If you are building a multi-tenant AI SaaS, use Langflow or LangChain directly instead."},
    {"question":"Which has the best document Q&A quality?","answer":"FastGPT, typically. Its preprocessing pipeline handles PDF layouts, tables, and structured documents better than Dify''s default ingest. Dify can match FastGPT''s quality with careful chunking and re-ranking configuration, but out of the box FastGPT wins on messy enterprise documents."},
    {"question":"Is Langflow just a GUI on top of LangChain?","answer":"Largely yes — that is the design. Langflow components map to LangChain primitives, and flows export as runnable LangChain code. This is a strength (you inherit LangChain''s ecosystem speed) and a weakness (you also inherit LangChain''s abstractions, some of which are leaky)."},
    {"question":"Do these work offline or with local models?","answer":"All three support local models via Ollama or OpenAI-compatible endpoints. Quality drops with smaller local models but functionally all three can run fully local. FastGPT ships with the cleanest Ollama integration for its ingest pipeline."},
    {"question":"Which is best for a single developer building a personal AI tool?","answer":"Dify, in most cases. The web UI is the most approachable, the built-in RAG handles the annoying parts, and the free tier on cloud or self-host on a small VPS makes it zero-friction. Langflow is a close second if you want more architectural control."},
    {"question":"Can I migrate from one to another later?","answer":"Partially. RAG indexes and document uploads are tool-specific and would need re-ingestion. Prompt logic and workflow structure can be recreated but not imported directly between tools. Plan the migration at about 30–50% of the original build time if you need to switch."},
    {"question":"Which one supports agent tools (HTTP calls, code execution)?","answer":"Dify most fully, with native HTTP request nodes, code execution sandboxes, and many integrations. Langflow via LangChain tools (broad but sometimes fiddly). FastGPT has limited tool use — it is primarily a Q&A platform, not a general agent builder."}
  ]'::jsonb,
  true,
  '2026-04-21T00:00:00Z',
  '2026-04-21T00:00:00Z',
  0
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 5) LangGraph vs CrewAI vs AutoGen — multi-agent frameworks
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = 'langgraph'),
    (SELECT id FROM tools WHERE slug = 'crewai'),
    (SELECT id FROM tools WHERE slug = 'autogen')
  ],
  'langgraph-vs-crewai-vs-autogen',
  '[
    {"dimension":"Best for","values":{"langgraph":"Production agents with state + checkpointing","crewai":"Quick role-based prototypes","autogen":"Multi-party conversational agents"}},
    {"dimension":"Design model","values":{"langgraph":"Graph of nodes + edges","crewai":"Role/Task/Crew DSL","autogen":"Conversable agents + group chats"}},
    {"dimension":"Learning curve","values":{"langgraph":"Steep","crewai":"Low","autogen":"Medium"}},
    {"dimension":"Observability","values":{"langgraph":"LangSmith (deep)","crewai":"CrewAI+ (growing)","autogen":"Basic + OTEL hooks"}},
    {"dimension":"Token efficiency","values":{"langgraph":"Best","crewai":"Moderate","autogen":"Highest overhead (5–6x LG)"}},
    {"dimension":"Production status","values":{"langgraph":"Mature · enterprise-adopted","crewai":"Growing · 30k+ stars","autogen":"Maintenance mode (→ MS Agent Framework)"}}
  ]'::jsonb,
  'Pick LangGraph if you are building for production and need state persistence, checkpointing, human-in-the-loop, and deep observability — it is the most enterprise-adopted option in 2026. Pick CrewAI if you want to go from idea to working multi-agent prototype in an afternoon with minimal ceremony. Pick AutoGen only for specific multi-party conversational patterns; otherwise note that Microsoft has shifted it to maintenance mode and new work is moving to the Microsoft Agent Framework.',
  'These are the three most-used multi-agent frameworks in 2026, and the choice between them is mostly a question of where you are in the build — prototype, production, or niche conversational pattern.

**LangGraph** models your agent system as a graph: nodes are units of work (LLM call, tool use, branching logic), edges are state transitions. You declare the graph explicitly, which takes longer to write than the alternatives but maps cleanly to production requirements like audit trails, replay, and checkpointed resumability. LangGraph ships with first-class state management (typed state objects flow through the graph), checkpointing to a persistent store (Postgres, Redis), streaming responses, and LangSmith observability that shows every node execution with inputs, outputs, token counts, and latency. When a run fails, you replay it from the failure node with modified state.

**CrewAI** takes the opposite bet: minimum ceremony, maximum speed to working prototype. You define agents with a role, a backstory, and a goal; you define tasks; you assemble them into a crew; you run it. Twenty lines of Python gets you a working multi-agent workflow. The role/task abstraction is intuitive for non-AI-engineers — a product manager can read a CrewAI config and understand what the system does. CrewAI has matured in 2026 with better checkpointing, a CrewAI+ observability tier, and a growing enterprise motion, but compared to LangGraph it is still earlier on the production curve.

**AutoGen** (from Microsoft) is structured around conversable agents — agents that talk to each other, potentially with a user agent in the loop. Its strength is conversation patterns: group chats, sequential dialogues, consensus debates. If your system genuinely needs multiple agents to discuss and converge on an answer, AutoGen''s primitives are the most expressive. As of 2026, Microsoft has moved AutoGen to maintenance mode and is consolidating its agent work under the Microsoft Agent Framework, which creates a succession-planning question for new AutoGen adopters — you can ship on it, but the ecosystem''s momentum has shifted.

**Where each wins**

Production readiness: LangGraph, by a clear margin. Checkpointing, state persistence, streaming, LangSmith tracing, and integration into the broader LangChain ecosystem (agent tools, memory, document loaders) make it the default choice when your agent is a real product, not a demo. LangGraph surpassed CrewAI in GitHub stars in early 2026 and is the most-requested agent framework in enterprise AI platform teams.

Prototyping speed: CrewAI. Time-to-working-prototype is minutes, not hours. For workshops, hackathons, and ''can we do X'' investigations, CrewAI gets you to signal faster than anything else.

Conversation patterns: AutoGen. If you need agent A and agent B to debate, with agent C moderating, AutoGen''s GroupChatManager handles this naturally. LangGraph can do it, but you hand-roll the turn-taking; CrewAI''s role model does not fit cleanly.

Token efficiency: LangGraph wins cleanly. Its explicit state and graph structure let you control exactly what context each node sees. CrewAI sends more than necessary by default. AutoGen''s conversational overhead — agents summarising and re-contextualising each other''s turns — is 5–6x LangGraph''s token cost on equivalent tasks.

Observability: LangSmith (LangGraph) is the deepest. You see every node, every tool call, every token in/out, latency, and replay capability. CrewAI+ is catching up but still shallower. AutoGen has OpenTelemetry hooks but you wire up your own observability stack.

Learning curve: CrewAI is easiest (role/task DSL, ~20 lines to working code). AutoGen is medium (conversable agent abstraction takes a session to internalise). LangGraph is steepest (explicit state types, graph definition, checkpoint config) but the work pays off in production.

**The succession question for AutoGen**

Microsoft''s shift of AutoGen to maintenance mode deserves a serious look before adopting. Existing AutoGen code will keep working, and Microsoft is positioning the Microsoft Agent Framework as the forward path. But for a new project in Q2 2026, choosing AutoGen means betting that the conversational primitives are unique enough to accept that your framework of choice is no longer the strategic priority of its maintainer. For teams that need exactly AutoGen''s conversation patterns (academic multi-agent research, consensus-building agents), that bet may be fine. For most teams, LangGraph or CrewAI is the safer choice.

**What to build on each**

LangGraph: a customer-support agent with handoff to human, a research agent that checkpoints and resumes after hours, a claims-processing agent that must be auditable.

CrewAI: a content-generation crew (researcher + writer + editor roles), a sales-ops agent that triages inbound leads, any prototype where role structure maps intuitively to the problem.

AutoGen: a group-debate simulator, a multi-agent reasoning research setup, a consensus-building pipeline where agents argue and converge. Take the maintenance-mode status into account.',
  'All three are free and open source, so the cost you pay is infrastructure plus LLM tokens.

**LangGraph** is MIT-licensed and free to self-host. LangSmith (the observability companion) has a free tier (5k traces/month) with paid tiers at $39/user/month and custom enterprise pricing. Checkpointing to Postgres or Redis is your infra cost ($20–$100/month typical). Token cost depends on how chatty your graph is — LangGraph''s explicit state makes it the most tunable of the three for cost. A typical production agent (moderate complexity, ~1000 runs/day) lands in the $100–$500/month LLM token range.

**CrewAI** is open source (MIT for the core) and free to use. CrewAI+ (the commercial observability and deployment tier) starts at $99/month for small teams. LLM token cost tends to run 1.5–2x LangGraph for equivalent work because CrewAI''s agents are more verbose by default.

**AutoGen** is MIT-licensed and free. Microsoft does not offer a commercial hosted tier (work is being consolidated under Microsoft Agent Framework). Token cost is the highest of the three — AutoGen''s conversational pattern means agents summarise and re-contextualise each other''s messages, inflating tokens 5–6x vs LangGraph. For a research setup this is fine; for production it adds up.

Hidden costs to flag: LangGraph + LangSmith on a large production workload can hit $500–$2000/month on observability alone — worth budgeting upfront. CrewAI prototypes that grow into production often need to be partially rewritten to add checkpointing and error recovery; budget 1–2 weeks of engineering for the productionisation. AutoGen''s token bloat is the most expensive silent cost — measure actual token use early, not estimate from framework documentation.',
  '[
    {"persona":"ML engineer shipping a production agent","recommendedSlug":"langgraph","reasoning":"Checkpointing, state persistence, streaming, and LangSmith tracing handle the parts of production that CrewAI and AutoGen leave to you. The steeper learning curve pays back in reduced on-call surface."},
    {"persona":"Product team prototyping an agent workflow","recommendedSlug":"crewai","reasoning":"CrewAI''s role/task DSL gets you from idea to working prototype in an afternoon. Use it to validate the concept, then reassess whether to productionise on CrewAI or rewrite in LangGraph."},
    {"persona":"Researcher studying multi-agent reasoning","recommendedSlug":"autogen","reasoning":"AutoGen''s conversable-agent primitives and group-chat patterns are the most expressive for research on agent dialogue, debate, and consensus. The maintenance-mode status is acceptable for research where long-term framework support matters less."},
    {"persona":"Enterprise team with audit + compliance requirements","recommendedSlug":"langgraph","reasoning":"LangGraph + LangSmith delivers full traces, token accounting, and replay — the artifacts audit teams ask for. CrewAI and AutoGen require you to build equivalent observability."},
    {"persona":"Team already on the LangChain ecosystem","recommendedSlug":"langgraph","reasoning":"LangGraph is the LangChain team''s supported path forward from LangChain agents. Migrating existing LangChain tools and memory primitives into LangGraph is significantly cheaper than porting to CrewAI or AutoGen."}
  ]'::jsonb,
  '[
    {"dimension":"GitHub stars (Apr 2026)","values":{"langgraph":{"score":"~28k","unit":"","source":"github.com/langchain-ai/langgraph"},"crewai":{"score":"~30k","unit":"","source":"github.com/crewAIInc/crewAI"},"autogen":{"score":"~39k","unit":"","source":"github.com/microsoft/autogen"}}},
    {"dimension":"Token cost (normalised)","values":{"langgraph":{"score":"1x","unit":"baseline","source":"community benchmarks"},"crewai":{"score":"1.5–2x","unit":"","source":"comparison benchmarks"},"autogen":{"score":"5–6x","unit":"","source":"community benchmarks"}}},
    {"dimension":"Time to first working multi-agent run","values":{"langgraph":{"score":"~60","unit":"min","source":"graph definition + state types"},"crewai":{"score":"~15","unit":"min","source":"role/task DSL"},"autogen":{"score":"~30","unit":"min","source":"conversable agent setup"}}},
    {"dimension":"Built-in checkpointing","values":{"langgraph":{"score":"Yes","unit":"Postgres/Redis","source":"LangGraph docs"},"crewai":{"score":"Partial","unit":"in-memory + plugin","source":"CrewAI+ docs"},"autogen":{"score":"No","unit":"","source":"bring-your-own"}}},
    {"dimension":"Observability depth","values":{"langgraph":{"score":"Deep","unit":"via LangSmith","source":"LangSmith product"},"crewai":{"score":"Medium","unit":"via CrewAI+","source":"CrewAI+ product"},"autogen":{"score":"Basic","unit":"OTEL hooks","source":"community"}}},
    {"dimension":"Maintainer momentum","values":{"langgraph":{"score":"Active","unit":"","source":"LangChain team core priority"},"crewai":{"score":"Active","unit":"","source":"active development"},"autogen":{"score":"Maintenance","unit":"","source":"Microsoft → Agent Framework"}}}
  ]'::jsonb,
  '[
    {"question":"Is LangGraph the same as LangChain?","answer":"No. LangChain is the broader ecosystem of components (models, prompts, memory, tools, document loaders). LangGraph is a newer, focused framework from the same team specifically for building agent graphs with state and control flow. You often use them together — LangGraph for the agent structure, LangChain for the components."},
    {"question":"Is CrewAI really production-ready?","answer":"For small-to-medium production workloads, yes, especially on the CrewAI+ tier with managed observability and deployment. For high-volume or audit-critical workloads, LangGraph''s checkpointing and tracing infrastructure is more battle-tested as of Q2 2026."},
    {"question":"Should I still choose AutoGen for new projects?","answer":"Only if you need its specific conversational patterns and accept the maintenance-mode status. Microsoft is consolidating agent work under the Microsoft Agent Framework, so a new AutoGen project in 2026 is betting on a framework that is no longer its maintainer''s strategic priority. For most teams, LangGraph or CrewAI is the safer choice."},
    {"question":"Which framework has the best observability?","answer":"LangGraph + LangSmith, clearly. You see every node execution, token counts per step, latency, and can replay runs from arbitrary checkpoints. CrewAI+ is catching up. AutoGen has OpenTelemetry hooks but you assemble the dashboards yourself."},
    {"question":"Can I migrate a CrewAI prototype to LangGraph?","answer":"Yes, but expect a partial rewrite. The role/task abstraction in CrewAI does not map 1:1 to LangGraph''s explicit state graph. Budget 30–60% of the original build time to port, primarily because you will add state types, checkpointing, and error handling that CrewAI left implicit."},
    {"question":"Which framework is best for tool-using agents (HTTP, code, APIs)?","answer":"All three support tools. LangGraph has the most robust tool-orchestration patterns (parallel tool calls, retry logic, conditional routing based on tool output). CrewAI treats tools as first-class inputs to tasks and is the most concise for simple tool use. AutoGen''s tool integration is functional but less refined than the others."},
    {"question":"Do these frameworks work with non-Anthropic/OpenAI models?","answer":"Yes. All three support any OpenAI-compatible endpoint, which includes DeepSeek, Mistral, Qwen, and local models via Ollama. LangGraph and CrewAI have more polished integrations with Anthropic and Google Gemini than AutoGen does."}
  ]'::jsonb,
  true,
  '2026-04-21T00:00:00Z',
  '2026-04-21T00:00:00Z',
  0
) ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================================
-- Verify inserts landed
-- ============================================================
-- Run these after applying:
--   SELECT slug, is_editorial, published_at,
--          jsonb_array_length(tldr) AS tldr_rows,
--          jsonb_array_length(faqs) AS faq_rows,
--          jsonb_array_length(benchmarks) AS bench_rows,
--          array_length(tool_ids, 1) AS tools_linked
--   FROM tool_comparisons
--   WHERE is_editorial = true
--   ORDER BY published_at DESC;
--
-- Expected: 5 rows, each with 5–7 tldr rows, 5–7 FAQs, 5–6 benchmarks,
-- 2 or 3 tool_ids linked.

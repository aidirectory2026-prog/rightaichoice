-- Step 42 editorial compare: cline-vs-aider-vs-continue
-- Split from 041_seed_comparisons_editorial.sql for safe paste.

-- 1) Cline vs Aider vs Continue — open-source AI coding tools
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$cline$body0$),
    (SELECT id FROM tools WHERE slug = $body1$aider$body1$),
    (SELECT id FROM tools WHERE slug = $body2$continue$body2$)
  ],
  $body3$cline-vs-aider-vs-continue$body3$,
  $body4$[
    {"dimension":"Best for","values":{"cline":"Cautious devs who want approval-gated agent runs in VS Code","aider":"Terminal power users who want surgical, git-aware edits","continue":"Teams standardising AI setup across VS Code + JetBrains"}},
    {"dimension":"Interface","values":{"cline":"VS Code extension","aider":"CLI + terminal","continue":"IDE extension + CLI"}},
    {"dimension":"Cost","values":{"cline":"Free · bring your own API key","aider":"Free · bring your own API key","continue":"Free · bring your own API key"}},
    {"dimension":"Learning curve","values":{"cline":"Low — click-through approvals","aider":"Medium — git/CLI fluency required","continue":"Medium — configure stack yourself"}},
    {"dimension":"SWE-bench style score","values":{"cline":"~48% (model-dependent)","aider":"52.7% polyglot","continue":"N/A — no unified benchmark"}},
    {"dimension":"Biggest drawback","values":{"cline":"Token-heavy loops on large repos","aider":"No autocomplete; CLI-only","continue":"Setup complexity for first-timers"}}
  ]$body4$::jsonb,
  $body5$Pick Aider if you live in the terminal and want surgical, cost-controlled edits with a clean git trail. Pick Cline if you want a Cursor-style agent experience inside VS Code with approval gates at every step. Pick Continue if you need to roll out a consistent AI coding setup across a team that uses both VS Code and JetBrains.$body5$,
  $body6$These three open-source tools now do most of what Cursor and Copilot do — with one important difference: you control the model, the cost, and the data. But they optimise for very different workflows, and picking the wrong one wastes a weekend of setup.

**How each one actually works**

Aider runs as a command-line process you launch inside a git repo. You tell it what to change, it reads the relevant files, proposes a diff, applies it, and commits with a generated message. Every change is a git commit, which means 'undo' is always one 'git reset' away. Aider uses a tool-use loop structurally similar to Cursor Composer or Claude Code, but it is bring-your-own-key — you plug in an Anthropic, OpenAI, or DeepSeek key and pay only for tokens. Aider maintains a 'repo map' that gives the model a compressed view of your codebase without stuffing every file into context, which is why its token bills tend to be noticeably lower than Cline's.

Cline installs as a VS Code extension and opens a side-panel chat. Its distinctive behaviour is the Plan/Act split — in Plan mode it analyses, proposes a sequence of file edits and shell commands, and waits for you to approve each one; in Act mode it executes. You see the file tree it touches, the commands it runs, and the diffs before they land. This makes Cline the gentlest way to let an agent loose in a repo, especially for developers who have never given an AI tool write access before. The tradeoff is token cost. Cline tends to load big chunks of context and can run fifteen or more tool calls for a task Aider would finish in four. If you point it at a fast, cheap model like Haiku or DeepSeek V3, it stays manageable; put Opus behind it and the meter spins.

Continue sits in between and deliberately does not own the workflow. It is an extension platform that provides a chat panel, tab autocomplete, inline edit, and a configuration layer that lets you bolt in any model, any embeddings provider, any context source. It runs inside VS Code, JetBrains, and increasingly Neovim, and there is a headless CLI for scripted jobs. The upside: one configuration file (config.yaml) that you can check into your repo or distribute to a team, pointing everyone at the same models, rules, and context providers. The downside: it is the most 'you assemble it' of the three, and the first-day experience involves more YAML than the other two.

**Where the real differences show up**

On a fresh bug — say, "this test is failing, fix it" — Aider typically lands the change in three to five tool calls, commits cleanly, and shows you the diff. Cline will often read more files, explain more, and ask for approval twice before landing the same fix. Continue, depending on how you have configured it, might behave like either — it is the most flexible and therefore the most dependent on good setup.

On a larger refactor that spans a dozen files, Aider's repo-map approach keeps it grounded without blowing up context. Cline tends to over-read and can hit model context limits on large monorepos unless you explicitly scope it with the '@' mentions. Continue with its codebase indexing (it ships a default retrieval pipeline) handles this well, but you have to remember to index first.

Autocomplete is Continue's home turf. Cline does not offer tab completions — it is chat and agent only. Aider is terminal-only and the same applies. If tab completion while you type matters to your flow, Continue is the only choice of the three.

Agent autonomy is Cline's strength. Its Plan/Act loop with step-by-step approval is hard to beat for developers who want the productivity of an agent without giving up control. Aider's loop is faster but less granular — it shows you what it wants to do, asks yes or no, and moves on. Continue is the least agentic; it leans on you to drive.

Model flexibility favours Aider and Continue. Both connect cleanly to local models via Ollama, and Aider in particular has built-in support for cost-capping modes that make DeepSeek and Qwen models quite usable for daily work. Cline works with any API-accessible model but is less tuned for strict token budgets.

**The honest tradeoffs**

None of these will feel as polished as Cursor on day one. Cursor's tab completion, command palette, and agent UI are genuinely ahead. What you are buying with these three is ownership: your model, your key, your data, your repo. For a regulated team that cannot ship prompts to Cursor's backend, that is the entire point. For a hobbyist who wants to keep their API bill under twenty dollars a month, it matters too.$body6$,
  $body7$All three are free and open source, so the cost you actually pay is token cost at your LLM provider of choice.

**Aider** tends to be the cheapest in practice. Its repo-map strategy and tight tool loops mean a typical bug fix runs $0.05–$0.30 with Sonnet, or under $0.05 with DeepSeek V3. Aider also has a '/architect' mode that lets you pair a high-end model (Opus, GPT-5) for planning with a cheap model for edits, which can cut bills by 60–80% on larger tasks.

**Cline** is the most expensive of the three per task. Its verbose approval loops and tendency to load full files rather than chunks mean typical tasks with Sonnet run $0.20–$1.50, and complex multi-file work can hit $5+. Running Cline on Haiku or DeepSeek keeps it reasonable; running Cline on Opus without limits is how you get a surprise $200 month.

**Continue** pricing depends entirely on what you plug in. Its autocomplete feature, if enabled with a cloud model, will be a constant background cost ($5–$30 per month for active use). If you route autocomplete to a local Ollama model and keep chat on a cloud model, you can get total spend under $10 per month.

Hidden costs to flag: Cline on a large monorepo can occasionally load hundreds of thousands of tokens in a single turn if you do not use '@file' scoping — watch for this on your provider dashboard. Continue's team tier (in beta) adds audit logging and centralised config for roughly $10 per seat per month.$body7$,
  $body8$[
    {"persona":"Solo developer on a tight API budget","recommendedSlug":"aider","reasoning":"Aider's repo map plus architect/editor model split keeps token bills an order of magnitude lower than Cline. If your monthly ceiling is $30, this is the only one of the three that will stay under it comfortably."},
    {"persona":"Developer new to agentic AI tools","recommendedSlug":"cline","reasoning":"Cline's Plan/Act approval flow shows you exactly what the agent wants to read, write, and run before anything happens. It is the safest on-ramp to giving an AI write access to your repo."},
    {"persona":"Team lead standardising AI tooling across a codebase","recommendedSlug":"continue","reasoning":"Continue's config.yaml can be checked into the repo so every developer gets the same models, rules, and context providers. Neither Aider nor Cline has a team-config story this clean."},
    {"persona":"Staff engineer doing multi-file refactors","recommendedSlug":"aider","reasoning":"Aider's git-native commit-per-change model and repo map make large refactors reviewable. Cline can do the work but the token cost and verbose loops slow you down on 20+ file changes."},
    {"persona":"Regulated-industry team needing local models","recommendedSlug":"continue","reasoning":"Continue has the deepest Ollama integration and lets you mix local embeddings with a cloud chat model. Aider supports local models but Continue's config model scales better across a team."}
  ]$body8$::jsonb,
  $body9$[
    {"dimension":"SWE-bench Verified (best config)","values":{"cline":{"score":"~48","unit":"%","source":"community runs, Sonnet 4.6"},"aider":{"score":"52.7","unit":"% polyglot","source":"aider.chat/docs/leaderboards"},"continue":{"score":"N/A","unit":"","source":"no unified benchmark"}}},
    {"dimension":"Median tokens per fix","values":{"cline":{"score":"~45k","unit":"tokens","source":"community benchmarks"},"aider":{"score":"~14k","unit":"tokens","source":"aider docs, repo-map mode"},"continue":{"score":"~20k","unit":"tokens","source":"varies by config"}}},
    {"dimension":"GitHub stars (Apr 2026)","values":{"cline":{"score":"~44k","unit":"","source":"github.com/cline/cline"},"aider":{"score":"~28k","unit":"","source":"github.com/Aider-AI/aider"},"continue":{"score":"~22k","unit":"","source":"github.com/continuedev/continue"}}},
    {"dimension":"First-run setup time","values":{"cline":{"score":"~3","unit":"min","source":"install extension + API key"},"aider":{"score":"~5","unit":"min","source":"pipx install + git init"},"continue":{"score":"~15","unit":"min","source":"install + config.yaml"}}},
    {"dimension":"Offers autocomplete","values":{"cline":{"score":"No","unit":"","source":"chat/agent only"},"aider":{"score":"No","unit":"","source":"terminal-only"},"continue":{"score":"Yes","unit":"","source":"tab completion built in"}}}
  ]$body9$::jsonb,
  $body10$[
    {"question":"Which open-source AI coding tool is cheapest to run?","answer":"Aider is the cheapest in practice because of its repo-map approach and architect/editor model split. A typical bug fix with DeepSeek V3 runs under $0.05. Cline on the same task with Sonnet 4.6 will usually cost 5–10x more."},
    {"question":"Can Cline, Aider, or Continue work offline with local models?","answer":"All three support local models via Ollama, but the experience differs. Continue has the deepest local-model integration and lets you mix local embeddings with cloud chat. Aider works well with local models but relies on tool-use capability, which limits you to modern local models (Qwen 2.5+, Llama 3.3+). Cline requires a model that follows its specific tool-calling format, which can be finicky on local backends."},
    {"question":"Which tool has the lowest risk of breaking my code?","answer":"Cline, because every edit and every shell command requires explicit approval in Plan mode. Aider commits automatically but uses git, so you can always undo with git reset. Continue's behaviour depends on how you configure agent mode — you choose how much autonomy to grant."},
    {"question":"Is Cline just a wrapper around Claude?","answer":"No. Cline works with any model that supports tool calling, including GPT-5, Gemini, DeepSeek V3, and local Ollama models. It is commonly used with Claude because Anthropic models are particularly good at tool use, but the tool itself is model-agnostic."},
    {"question":"Should I switch from Cursor to one of these?","answer":"Not unless you have a specific reason — data privacy, API cost ceiling, local-model requirement, or team-wide standardisation. Cursor's tab completion and polished IDE remain ahead of what these three offer out of the box. But if any of those reasons apply, all three are genuine alternatives now, not second-class ones."},
    {"question":"Which of these will survive the next two years?","answer":"All three have active maintainers, substantial GitHub stars, and commercial or foundation backing behind them. Continue has raised venture funding and has a clearer enterprise motion; Aider is maintained by Paul Gauthier with an engaged community; Cline has VC backing and is growing rapidly. None is in obvious decline."},
    {"question":"Can I use more than one of these together?","answer":"Yes, and many developers do. Continue for tab autocomplete, Aider in the terminal for refactors, Cline for larger agent tasks is a common stack. They do not conflict because they touch different parts of your workflow."}
  ]$body10$::jsonb,
  true,
  $body11$2026-04-21T00:00:00Z$body11$,
  $body12$2026-04-21T00:00:00Z$body12$,
  0
) ON CONFLICT (slug) DO NOTHING;

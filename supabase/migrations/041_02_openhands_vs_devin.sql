-- Step 42 editorial compare: openhands-vs-devin
-- Split from 041_seed_comparisons_editorial.sql for safe paste.

-- 2) OpenHands vs Devin — autonomous coding agents
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$openhands$body0$),
    (SELECT id FROM tools WHERE slug = $body1$devin$body1$)
  ],
  $body2$openhands-vs-devin$body2$,
  $body3$[
    {"dimension":"Best for","values":{"openhands":"Teams wanting self-hosted, model-agnostic agents","devin":"Orgs buying a polished managed product"}},
    {"dimension":"Deployment","values":{"openhands":"Self-hosted · open source (MIT)","devin":"Cloud only · proprietary"}},
    {"dimension":"Starting price","values":{"openhands":"Free · LLM API costs only","devin":"$20/mo Core + usage · $500+/mo Team"}},
    {"dimension":"Model support","values":{"openhands":"Claude, GPT-5, Gemini, local models","devin":"Proprietary model stack (locked)"}},
    {"dimension":"SWE-bench Verified","values":{"openhands":"~55% (Sonnet 4.6)","devin":"~14–20% (Cognition published)"}},
    {"dimension":"Biggest drawback","values":{"openhands":"DIY setup + ops overhead","devin":"High cost · slow runs · spotty real-world results"}}
  ]$body3$::jsonb,
  $body4$Pick OpenHands if you want a transparent, self-hosted autonomous coding agent with your own model and no vendor lock-in — the SWE-bench numbers are better than Devin's in public benchmarks. Pick Devin only if your procurement process favours managed SaaS and you are willing to accept a 10–50x cost premium for a polished UI and a Slack integration you could build yourself.$body4$,
  $body5$These two tools sit on opposite ends of the "autonomous coding agent" spectrum. Both claim to do what most other AI coding tools will not: accept a task description, then go do the whole thing — research, code, test, open a pull request — with minimal supervision. The difference is how they deliver that promise and what it costs.

**OpenHands (formerly OpenDevin)** is an open-source agent framework under MIT license. You clone the repo, run it in Docker, bring your own LLM API key, and point it at a task. Architecturally it resembles Devin's pitch: a sandboxed VM with browser, shell, and code editor, driven by a planning loop that breaks work into steps and executes them with tool calls. Because it is open source, you can inspect every prompt, fork the orchestrator, and wire it to your own CI. The project spun out of a community response to Devin's initial demo in March 2024 and has since become the reference implementation for what an autonomous coding agent looks like in public.

**Devin**, from Cognition, is the managed SaaS original. You talk to it in a web UI (or Slack), it spins up a cloud sandbox, and it reports progress through the session. The interface is polished: a live terminal, a browser pane, a plan view, and integrations into GitHub, Slack, Linear, and Jira. Devin is a product, not a framework — you do not bring your own model, you do not touch the orchestrator, you pay per session.

**What they actually do well**

OpenHands is where the benchmark numbers live. On SWE-bench Verified (real-world GitHub bug fixes), OpenHands configurations with Claude Sonnet 4.6 have hit the mid-50s, putting it competitive with the best agent runs published anywhere. It is also the tool you reach for if you need to write your own agent — the codebase is readable, the tool-use loop is well documented, and the Apache/MIT licensing means you can ship derivatives commercially.

Devin's win is the experience. The live browser pane lets it research a library, read docs, and show you what it found. The GitHub integration is genuinely smooth — you can @mention Devin in an issue and a pull request shows up. For non-engineering stakeholders (product managers filing bug reports, designers requesting small fixes), Devin's chat interface is easier to approach than a JSON-configured self-hosted agent. Devin's strength is not raw capability, it is packaging.

**Where the gap is real**

Real-world performance has been Devin's weak point. The initial launch showed end-to-end feature builds that looked magical in video; third-party and customer evaluations have generally landed in the 14–20% solve rate range on SWE-bench, with longer runs and higher costs than alternatives. The tool has improved through 2025 and 2026, but the gap between demo and daily reality has been wide enough that some early enterprise customers have migrated to OpenHands or Claude Code subagents for actual work.

OpenHands requires you to operate it. There is no one-click deploy. You run Docker, manage API keys, observe cost, handle sandbox security, update the repo when releases ship. For a team with a platform engineer this is trivial; for a non-technical buyer this is the whole blocker.

Model access is a clean difference. OpenHands lets you route to Anthropic, OpenAI, Google, DeepSeek, local Ollama, or any LiteLLM-supported provider. When a new SOTA model ships on a Friday, you have it on Monday. Devin is locked to Cognition's stack, which means you wait for them to integrate, tune, and release.

Integration quality flips the other way. Devin ships polished GitHub, Slack, Linear, and Jira integrations. OpenHands ships the agent; integrations you build or assemble from community examples. For a team that lives in Slack and wants zero friction, Devin is closer to done.

**When Devin is worth it**

Despite the cost and benchmark gap, Devin has a legitimate buyer: organisations where no one on the team will ever want to operate a Docker stack, where the procurement preference is managed SaaS, and where the tasks thrown at the agent are broad product-manager-style requests ("add export to CSV on the reports page") rather than narrow engineering problems. In that context, Devin's UI, Slack integration, and "just send it a Linear ticket" flow do save meaningful time. The question is whether that saves enough to justify $500/month per seat when OpenHands plus Sonnet 4.6 would do the same work for a fraction of the API cost.

For most engineering teams reading this, the answer is no. For a growth-stage company where the head of engineering wants a PM-facing tool and does not want to staff an AI platform, Devin has a case.$body5$,
  $body6$The cost gap between these two is the largest of any pair in this comparison.

**OpenHands** costs only what you spend on LLM API tokens. A typical task run with Claude Sonnet 4.6 costs between $0.50 and $5 depending on length; a full SWE-bench run is in the $10–$30 range per batch of tasks. Self-hosting compute for the sandbox is marginal (a $20/month VPS handles dozens of concurrent runs). Total monthly spend for a single developer doing daily agent work lands around $30–$100. A team of ten might spend $500–$1,500 per month combined.

**Devin** starts at $20/month for the Core plan but that tier is heavily rate-limited and aimed at evaluation. Real use lives on the Team plan, which is custom-priced and typically lands in the $500/seat/month range based on public reports, with usage overages on long-running sessions. A team of ten using Devin for daily work is commonly a $5,000–$10,000/month line item, not counting the procurement cycle.

The math: if Devin and OpenHands produced identical output, you are paying roughly 10x for Devin's UI and integrations. In practice, OpenHands produces better benchmark results in public testing, so the premium is even less defensible on capability grounds alone. Hidden cost to watch on Devin: long-running sessions (the agent gets stuck and burns hours) inflate the usage line unexpectedly. On OpenHands, the equivalent failure mode is the agent loop consuming API tokens on repeat tool calls; cap it by setting a max-iterations ceiling and a per-run budget.$body6$,
  $body7$[
    {"persona":"Platform engineer building internal AI tooling","recommendedSlug":"openhands","reasoning":"OpenHands gives you an auditable, forkable agent stack you can integrate into your CI and customise per team. Devin's closed architecture makes it a black box you cannot tune."},
    {"persona":"Non-technical PM filing bug tickets","recommendedSlug":"devin","reasoning":"Devin's Slack and Linear integrations let a PM file a ticket and get a PR without talking to engineering. OpenHands can technically be wrapped in similar UX but the team has to build it."},
    {"persona":"Cost-conscious startup under $2k/mo AI budget","recommendedSlug":"openhands","reasoning":"OpenHands plus a Claude or DeepSeek key handles the same work Devin does at roughly 10% of the cost. For a small team, Devin's pricing does not make sense until you hire a dedicated platform engineer."},
    {"persona":"Regulated-industry team with data-residency needs","recommendedSlug":"openhands","reasoning":"OpenHands runs entirely in your VPC — agent, sandbox, and model (via local or private LLM). Devin sends your code and prompts to Cognition's cloud, which is a non-starter in regulated contexts."},
    {"persona":"Agency shipping client features fast","recommendedSlug":"devin","reasoning":"If client contracts preclude self-hosted tooling and the team cannot staff a platform engineer, Devin's managed experience is worth the premium. Factor the cost into your retainer."}
  ]$body7$::jsonb,
  $body8$[
    {"dimension":"SWE-bench Verified (best public)","values":{"openhands":{"score":"55.0","unit":"%","source":"SWE-bench leaderboard, Sonnet 4.6 config"},"devin":{"score":"14–20","unit":"%","source":"Cognition blog + independent runs"}}},
    {"dimension":"Monthly cost (1 dev, daily use)","values":{"openhands":{"score":"$30–$100","unit":"","source":"LLM API tokens only"},"devin":{"score":"$500+","unit":"/seat","source":"Team plan public pricing"}}},
    {"dimension":"Cold-start latency","values":{"openhands":{"score":"~5","unit":"s","source":"local Docker"},"devin":{"score":"~30–60","unit":"s","source":"cloud sandbox boot"}}},
    {"dimension":"Models supported","values":{"openhands":{"score":"30+","unit":"providers","source":"LiteLLM integration"},"devin":{"score":"1","unit":"proprietary stack","source":"Cognition-selected"}}},
    {"dimension":"GitHub stars","values":{"openhands":{"score":"~62k","unit":"","source":"github.com/All-Hands-AI/OpenHands"},"devin":{"score":"N/A","unit":"closed source","source":"—"}}},
    {"dimension":"Source availability","values":{"openhands":{"score":"MIT","unit":"license","source":"fully open source"},"devin":{"score":"Closed","unit":"","source":"proprietary SaaS"}}}
  ]$body8$::jsonb,
  $body9$[
    {"question":"Is OpenHands the same as OpenDevin?","answer":"Yes. OpenDevin rebranded to OpenHands in late 2024 to distance the project from direct Devin comparisons and reflect that it had grown beyond the original 'open Devin' framing. The GitHub repo (All-Hands-AI/OpenHands) and the organisation are the same."},
    {"question":"Why does OpenHands score higher than Devin on SWE-bench?","answer":"Two reasons. First, OpenHands can run on top of frontier models (Sonnet 4.6, GPT-5) while Devin is locked to Cognition's internal stack. Second, OpenHands benefits from community tuning: dozens of researchers and engineers have iterated on its prompts and loop structure in public. Devin's improvements happen behind a closed wall."},
    {"question":"Can Devin edit a pull request or just open new ones?","answer":"Devin can iterate on existing PRs when you @mention it in comments. The quality of that iteration varies — it is generally better at opening new PRs than at responding to nuanced code-review feedback on existing ones."},
    {"question":"Is self-hosting OpenHands hard?","answer":"Not for an engineer comfortable with Docker. The official quickstart runs a container that opens a web UI on localhost. For production team use, you want a small VPS, API key management, and a sandbox-isolation setup — a few hours of platform work, not weeks."},
    {"question":"Can I run OpenHands on local models only?","answer":"Yes, via Ollama or an OpenAI-compatible local server. Quality drops meaningfully — as of April 2026, no local model matches Sonnet 4.6 or GPT-5 on agent tasks. Use local only if data restrictions require it."},
    {"question":"Is Devin worth it if we already have Claude Code?","answer":"For most teams, no. Claude Code's subagents cover the autonomous-execution use case at Pro subscription prices ($20/month) with better real-world results. Devin's unique value is its non-engineer-facing UX (Slack/Linear/Jira flows), not its coding ability."},
    {"question":"Which tool has the better security story?","answer":"OpenHands, because you control the sandbox, the VPC, and the data flow. Devin's security depends on Cognition's SOC 2 controls — strong by SaaS standards, but your code still leaves your perimeter. For regulated industries, OpenHands self-hosted is the only viable option."}
  ]$body9$::jsonb,
  true,
  $body10$2026-04-21T00:00:00Z$body10$,
  $body11$2026-04-21T00:00:00Z$body11$,
  0
) ON CONFLICT (slug) DO NOTHING;

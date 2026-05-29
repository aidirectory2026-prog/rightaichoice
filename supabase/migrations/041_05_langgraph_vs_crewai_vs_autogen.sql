-- Step 42 editorial compare: langgraph-vs-crewai-vs-autogen
-- Split from 041_seed_comparisons_editorial.sql for safe paste.

-- 5) LangGraph vs CrewAI vs AutoGen — multi-agent frameworks
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$langgraph$body0$),
    (SELECT id FROM tools WHERE slug = $body1$crewai$body1$),
    (SELECT id FROM tools WHERE slug = $body2$autogen$body2$)
  ],
  $body3$langgraph-vs-crewai-vs-autogen$body3$,
  $body4$[
    {"dimension":"Best for","values":{"langgraph":"Production agents with state + checkpointing","crewai":"Quick role-based prototypes","autogen":"Multi-party conversational agents"}},
    {"dimension":"Design model","values":{"langgraph":"Graph of nodes + edges","crewai":"Role/Task/Crew DSL","autogen":"Conversable agents + group chats"}},
    {"dimension":"Learning curve","values":{"langgraph":"Steep","crewai":"Low","autogen":"Medium"}},
    {"dimension":"Observability","values":{"langgraph":"LangSmith (deep)","crewai":"CrewAI+ (growing)","autogen":"Basic + OTEL hooks"}},
    {"dimension":"Token efficiency","values":{"langgraph":"Best","crewai":"Moderate","autogen":"Highest overhead (5–6x LG)"}},
    {"dimension":"Production status","values":{"langgraph":"Mature · enterprise-adopted","crewai":"Growing · 30k+ stars","autogen":"Maintenance mode (→ MS Agent Framework)"}}
  ]$body4$::jsonb,
  $body5$Pick LangGraph if you are building for production and need state persistence, checkpointing, human-in-the-loop, and deep observability — it is the most enterprise-adopted option in 2026. Pick CrewAI if you want to go from idea to working multi-agent prototype in an afternoon with minimal ceremony. Pick AutoGen only for specific multi-party conversational patterns; otherwise note that Microsoft has shifted it to maintenance mode and new work is moving to the Microsoft Agent Framework.$body5$,
  $body6$These are the three most-used multi-agent frameworks in 2026, and the choice between them is mostly a question of where you are in the build — prototype, production, or niche conversational pattern.

**LangGraph** models your agent system as a graph: nodes are units of work (LLM call, tool use, branching logic), edges are state transitions. You declare the graph explicitly, which takes longer to write than the alternatives but maps cleanly to production requirements like audit trails, replay, and checkpointed resumability. LangGraph ships with first-class state management (typed state objects flow through the graph), checkpointing to a persistent store (Postgres, Redis), streaming responses, and LangSmith observability that shows every node execution with inputs, outputs, token counts, and latency. When a run fails, you replay it from the failure node with modified state.

**CrewAI** takes the opposite bet: minimum ceremony, maximum speed to working prototype. You define agents with a role, a backstory, and a goal; you define tasks; you assemble them into a crew; you run it. Twenty lines of Python gets you a working multi-agent workflow. The role/task abstraction is intuitive for non-AI-engineers — a product manager can read a CrewAI config and understand what the system does. CrewAI has matured in 2026 with better checkpointing, a CrewAI+ observability tier, and a growing enterprise motion, but compared to LangGraph it is still earlier on the production curve.

**AutoGen** (from Microsoft) is structured around conversable agents — agents that talk to each other, potentially with a user agent in the loop. Its strength is conversation patterns: group chats, sequential dialogues, consensus debates. If your system genuinely needs multiple agents to discuss and converge on an answer, AutoGen's primitives are the most expressive. As of 2026, Microsoft has moved AutoGen to maintenance mode and is consolidating its agent work under the Microsoft Agent Framework, which creates a succession-planning question for new AutoGen adopters — you can ship on it, but the ecosystem's momentum has shifted.

**Where each wins**

Production readiness: LangGraph, by a clear margin. Checkpointing, state persistence, streaming, LangSmith tracing, and integration into the broader LangChain ecosystem (agent tools, memory, document loaders) make it the default choice when your agent is a real product, not a demo. LangGraph surpassed CrewAI in GitHub stars in early 2026 and is the most-requested agent framework in enterprise AI platform teams.

Prototyping speed: CrewAI. Time-to-working-prototype is minutes, not hours. For workshops, hackathons, and 'can we do X' investigations, CrewAI gets you to signal faster than anything else.

Conversation patterns: AutoGen. If you need agent A and agent B to debate, with agent C moderating, AutoGen's GroupChatManager handles this naturally. LangGraph can do it, but you hand-roll the turn-taking; CrewAI's role model does not fit cleanly.

Token efficiency: LangGraph wins cleanly. Its explicit state and graph structure let you control exactly what context each node sees. CrewAI sends more than necessary by default. AutoGen's conversational overhead — agents summarising and re-contextualising each other's turns — is 5–6x LangGraph's token cost on equivalent tasks.

Observability: LangSmith (LangGraph) is the deepest. You see every node, every tool call, every token in/out, latency, and replay capability. CrewAI+ is catching up but still shallower. AutoGen has OpenTelemetry hooks but you wire up your own observability stack.

Learning curve: CrewAI is easiest (role/task DSL, ~20 lines to working code). AutoGen is medium (conversable agent abstraction takes a session to internalise). LangGraph is steepest (explicit state types, graph definition, checkpoint config) but the work pays off in production.

**The succession question for AutoGen**

Microsoft's shift of AutoGen to maintenance mode deserves a serious look before adopting. Existing AutoGen code will keep working, and Microsoft is positioning the Microsoft Agent Framework as the forward path. But for a new project in Q2 2026, choosing AutoGen means betting that the conversational primitives are unique enough to accept that your framework of choice is no longer the strategic priority of its maintainer. For teams that need exactly AutoGen's conversation patterns (academic multi-agent research, consensus-building agents), that bet may be fine. For most teams, LangGraph or CrewAI is the safer choice.

**What to build on each**

LangGraph: a customer-support agent with handoff to human, a research agent that checkpoints and resumes after hours, a claims-processing agent that must be auditable.

CrewAI: a content-generation crew (researcher + writer + editor roles), a sales-ops agent that triages inbound leads, any prototype where role structure maps intuitively to the problem.

AutoGen: a group-debate simulator, a multi-agent reasoning research setup, a consensus-building pipeline where agents argue and converge. Take the maintenance-mode status into account.$body6$,
  $body7$All three are free and open source, so the cost you pay is infrastructure plus LLM tokens.

**LangGraph** is MIT-licensed and free to self-host. LangSmith (the observability companion) has a free tier (5k traces/month) with paid tiers at $39/user/month and custom enterprise pricing. Checkpointing to Postgres or Redis is your infra cost ($20–$100/month typical). Token cost depends on how chatty your graph is — LangGraph's explicit state makes it the most tunable of the three for cost. A typical production agent (moderate complexity, ~1000 runs/day) lands in the $100–$500/month LLM token range.

**CrewAI** is open source (MIT for the core) and free to use. CrewAI+ (the commercial observability and deployment tier) starts at $99/month for small teams. LLM token cost tends to run 1.5–2x LangGraph for equivalent work because CrewAI's agents are more verbose by default.

**AutoGen** is MIT-licensed and free. Microsoft does not offer a commercial hosted tier (work is being consolidated under Microsoft Agent Framework). Token cost is the highest of the three — AutoGen's conversational pattern means agents summarise and re-contextualise each other's messages, inflating tokens 5–6x vs LangGraph. For a research setup this is fine; for production it adds up.

Hidden costs to flag: LangGraph + LangSmith on a large production workload can hit $500–$2000/month on observability alone — worth budgeting upfront. CrewAI prototypes that grow into production often need to be partially rewritten to add checkpointing and error recovery; budget 1–2 weeks of engineering for the productionisation. AutoGen's token bloat is the most expensive silent cost — measure actual token use early, not estimate from framework documentation.$body7$,
  $body8$[
    {"persona":"ML engineer shipping a production agent","recommendedSlug":"langgraph","reasoning":"Checkpointing, state persistence, streaming, and LangSmith tracing handle the parts of production that CrewAI and AutoGen leave to you. The steeper learning curve pays back in reduced on-call surface."},
    {"persona":"Product team prototyping an agent workflow","recommendedSlug":"crewai","reasoning":"CrewAI's role/task DSL gets you from idea to working prototype in an afternoon. Use it to validate the concept, then reassess whether to productionise on CrewAI or rewrite in LangGraph."},
    {"persona":"Researcher studying multi-agent reasoning","recommendedSlug":"autogen","reasoning":"AutoGen's conversable-agent primitives and group-chat patterns are the most expressive for research on agent dialogue, debate, and consensus. The maintenance-mode status is acceptable for research where long-term framework support matters less."},
    {"persona":"Enterprise team with audit + compliance requirements","recommendedSlug":"langgraph","reasoning":"LangGraph + LangSmith delivers full traces, token accounting, and replay — the artifacts audit teams ask for. CrewAI and AutoGen require you to build equivalent observability."},
    {"persona":"Team already on the LangChain ecosystem","recommendedSlug":"langgraph","reasoning":"LangGraph is the LangChain team's supported path forward from LangChain agents. Migrating existing LangChain tools and memory primitives into LangGraph is significantly cheaper than porting to CrewAI or AutoGen."}
  ]$body8$::jsonb,
  $body9$[
    {"dimension":"GitHub stars (Apr 2026)","values":{"langgraph":{"score":"~28k","unit":"","source":"github.com/langchain-ai/langgraph"},"crewai":{"score":"~30k","unit":"","source":"github.com/crewAIInc/crewAI"},"autogen":{"score":"~39k","unit":"","source":"github.com/microsoft/autogen"}}},
    {"dimension":"Token cost (normalised)","values":{"langgraph":{"score":"1x","unit":"baseline","source":"community benchmarks"},"crewai":{"score":"1.5–2x","unit":"","source":"comparison benchmarks"},"autogen":{"score":"5–6x","unit":"","source":"community benchmarks"}}},
    {"dimension":"Time to first working multi-agent run","values":{"langgraph":{"score":"~60","unit":"min","source":"graph definition + state types"},"crewai":{"score":"~15","unit":"min","source":"role/task DSL"},"autogen":{"score":"~30","unit":"min","source":"conversable agent setup"}}},
    {"dimension":"Built-in checkpointing","values":{"langgraph":{"score":"Yes","unit":"Postgres/Redis","source":"LangGraph docs"},"crewai":{"score":"Partial","unit":"in-memory + plugin","source":"CrewAI+ docs"},"autogen":{"score":"No","unit":"","source":"bring-your-own"}}},
    {"dimension":"Observability depth","values":{"langgraph":{"score":"Deep","unit":"via LangSmith","source":"LangSmith product"},"crewai":{"score":"Medium","unit":"via CrewAI+","source":"CrewAI+ product"},"autogen":{"score":"Basic","unit":"OTEL hooks","source":"community"}}},
    {"dimension":"Maintainer momentum","values":{"langgraph":{"score":"Active","unit":"","source":"LangChain team core priority"},"crewai":{"score":"Active","unit":"","source":"active development"},"autogen":{"score":"Maintenance","unit":"","source":"Microsoft → Agent Framework"}}}
  ]$body9$::jsonb,
  $body10$[
    {"question":"Is LangGraph the same as LangChain?","answer":"No. LangChain is the broader ecosystem of components (models, prompts, memory, tools, document loaders). LangGraph is a newer, focused framework from the same team specifically for building agent graphs with state and control flow. You often use them together — LangGraph for the agent structure, LangChain for the components."},
    {"question":"Is CrewAI really production-ready?","answer":"For small-to-medium production workloads, yes, especially on the CrewAI+ tier with managed observability and deployment. For high-volume or audit-critical workloads, LangGraph's checkpointing and tracing infrastructure is more battle-tested as of Q2 2026."},
    {"question":"Should I still choose AutoGen for new projects?","answer":"Only if you need its specific conversational patterns and accept the maintenance-mode status. Microsoft is consolidating agent work under the Microsoft Agent Framework, so a new AutoGen project in 2026 is betting on a framework that is no longer its maintainer's strategic priority. For most teams, LangGraph or CrewAI is the safer choice."},
    {"question":"Which framework has the best observability?","answer":"LangGraph + LangSmith, clearly. You see every node execution, token counts per step, latency, and can replay runs from arbitrary checkpoints. CrewAI+ is catching up. AutoGen has OpenTelemetry hooks but you assemble the dashboards yourself."},
    {"question":"Can I migrate a CrewAI prototype to LangGraph?","answer":"Yes, but expect a partial rewrite. The role/task abstraction in CrewAI does not map 1:1 to LangGraph's explicit state graph. Budget 30–60% of the original build time to port, primarily because you will add state types, checkpointing, and error handling that CrewAI left implicit."},
    {"question":"Which framework is best for tool-using agents (HTTP, code, APIs)?","answer":"All three support tools. LangGraph has the most robust tool-orchestration patterns (parallel tool calls, retry logic, conditional routing based on tool output). CrewAI treats tools as first-class inputs to tasks and is the most concise for simple tool use. AutoGen's tool integration is functional but less refined than the others."},
    {"question":"Do these frameworks work with non-Anthropic/OpenAI models?","answer":"Yes. All three support any OpenAI-compatible endpoint, which includes DeepSeek, Mistral, Qwen, and local models via Ollama. LangGraph and CrewAI have more polished integrations with Anthropic and Google Gemini than AutoGen does."}
  ]$body10$::jsonb,
  true,
  $body11$2026-04-21T00:00:00Z$body11$,
  $body12$2026-04-21T00:00:00Z$body12$,
  0
) ON CONFLICT (slug) DO NOTHING;

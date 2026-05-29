-- Step 42 editorial compare: dify-vs-langflow-vs-fastgpt
-- Split from 041_seed_comparisons_editorial.sql for safe paste.

-- 4) Dify vs Langflow vs FastGPT — low-code LLM app platforms
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$dify$body0$),
    (SELECT id FROM tools WHERE slug = $body1$langflow$body1$),
    (SELECT id FROM tools WHERE slug = $body2$fastgpt$body2$)
  ],
  $body3$dify-vs-langflow-vs-fastgpt$body3$,
  $body4$[
    {"dimension":"Best for","values":{"dify":"Production LLM apps with built-in RAG + agents","langflow":"Visual prototyping on open protocols","fastgpt":"Internal knowledge-base Q&A at scale"}},
    {"dimension":"License","values":{"dify":"Source-available · no multi-tenant SaaS use","langflow":"Apache 2.0 · fully open","fastgpt":"FastGPT OSS license · commercial use permitted"}},
    {"dimension":"RAG engine","values":{"dify":"Built-in · multi-source ingest","langflow":"BYO · configure retriever nodes","fastgpt":"Built-in · enterprise-doc focused"}},
    {"dimension":"Hosting","values":{"dify":"Self-host or cloud (paid)","langflow":"Self-host or DataStax cloud","fastgpt":"Self-host or cloud"}},
    {"dimension":"Primary interface","values":{"dify":"Web app studio + API","langflow":"Visual canvas + chat pane","fastgpt":"Web app with flow editor"}},
    {"dimension":"Agent support","values":{"dify":"First-class · tools + workflows","langflow":"Yes · via LangChain components","fastgpt":"Limited · Q&A-focused"}}
  ]$body4$::jsonb,
  $body5$Pick Dify if you want to ship a production LLM app with built-in RAG, agents, and observability and do not need to operate a multi-tenant SaaS on top. Pick Langflow if you want a truly open-source visual canvas on Apache 2.0 with no license strings and full model flexibility. Pick FastGPT if your use case is bounded to internal knowledge-base Q&A with automated workflows and you value ingest quality over agent breadth.$body5$,
  $body6$These three low-code LLM platforms are often listed together but they are not interchangeable. Each was built around a different core assumption about what users want to do, and picking wrong means you fight the tool for a month before realising.

**Dify** is the most opinionated about production. It ships as a full LLM application platform — a visual workflow studio, a built-in RAG pipeline, agent tooling, prompt versioning, evaluation, and an observability layer — all wired together. You create an 'app' (chatbot, workflow, agent, or text generator), configure it in the web UI, and expose it via a generated API endpoint. The RAG engine is a standout: upload PDFs, plug in Notion or a web source, and Dify handles chunking, embedding, retrieval, and re-ranking without you touching a line of code. Dify's variable system (variables can store files, user inputs, component outputs, and flow across nodes) is powerful but takes a session to click.

**Langflow** takes the opposite philosophy. It is a visual canvas for chaining AI components — retrieval, prompts, tools, agents — with a live chat pane so you can test while you build. Under the hood it leans on LangChain's component library, which means almost anything in the LangChain ecosystem (new vector DB, new model provider, new parser) shows up in Langflow quickly. The license is Apache 2.0 with no usage restrictions, so you can embed Langflow-built flows into your own SaaS without compliance concerns. The tradeoff is that Langflow is deliberately a workbench, not an application — observability, auth, versioning, and deployment are your problem.

**FastGPT** is the most use-case-focused of the three. It is optimised for one job: building enterprise knowledge-base assistants. The ingestion pipeline is notably strong — FastGPT handles messy PDFs, Word documents, Markdown, and web sources with preprocessing that catches layout issues most tools miss. It offers a visual Flow module for complex Q&A logic (routing between documents, multi-turn disambiguation, follow-up actions) that is more mature than Dify's for pure knowledge-base work. Where FastGPT falls short is agent breadth: if you want an assistant that books meetings, queries APIs, and reasons across tools, FastGPT was not designed for that — Dify is.

**Where each one wins cleanly**

Production polish: Dify. The combination of evaluation, observability, prompt versioning, and team features is noticeably ahead of the other two. If you are shipping a customer-facing LLM app and care about debugging production behaviour, Dify is where to start.

Open-source freedom: Langflow. Apache 2.0 means you can build a SaaS on top and sell it. Dify's source-available license explicitly forbids multi-tenant SaaS use, which is a hard stop for many commercial scenarios. FastGPT's license is more permissive than Dify but less battle-tested in litigation.

Ingestion quality: FastGPT. The document preprocessing (table extraction, header detection, layout-aware chunking) beats Dify's default ingest on complex PDFs. For an assistant over a repository of compliance documents, FastGPT typically produces better retrieval quality without tuning.

Agent capability: Dify. The workflow editor + tool integrations (HTTP request, code execution, many third-party connectors) make Dify the best of the three for building agents that do more than chat about documents.

Visual debugging: Dify and Langflow tie. Both show execution duration per node, input/output values, and clear errors inline. FastGPT's debugging is functional but less detailed.

**The licensing trap**

The most common mistake teams make is choosing Dify for a project that turns into a multi-tenant SaaS. Dify's license forbids this — you cannot run a hosted Dify instance that serves isolated tenants as a commercial product. If that is the endgame, Langflow is the only one of the three where the license supports it outright. This is not theoretical — several teams have had to rewrite flows into LangChain or Langflow late in the build because they did not read Dify's license terms.

**The practical shape of each**

A three-person startup building an internal AI assistant on company docs: FastGPT for the ingest, or Dify if agent tools matter.

A mid-sized company shipping an external AI feature inside its product: Dify if the feature is standalone, Langflow (or raw LangChain) if it needs to be deeply embedded.

A researcher prototyping an agent architecture: Langflow, because the canvas lets you iterate on structure visually and export as LangChain code.

A team building a multi-tenant AI SaaS: Langflow, or skip the low-code layer entirely and use LangGraph directly.$body6$,
  $body7$**Dify** is free for self-hosting under its source-available license (subject to the no-SaaS clause). The cloud-hosted Dify service has a free tier (200 messages/month on the Sandbox plan), a Professional tier at $59/month (5,000 messages, 200 knowledge docs), and a Team tier at $159/month (10,000 messages, 500 docs, workspace features). LLM API costs are separate — Dify routes to your OpenAI, Anthropic, or Gemini key, and those tokens are billed by the provider.

**Langflow** is free under Apache 2.0 for unlimited self-hosting. The hosted DataStax Astra Langflow service is free for evaluation with paid tiers for production workloads, but most users self-host on a small VPS ($20–50/month). LLM API costs are pass-through to your model provider.

**FastGPT** has an open-source edition that is free for self-hosting with full features. The FastGPT Cloud service is the commercial path, with a free Experience plan, a Pro plan at roughly $20/month per user, and Enterprise custom pricing. LLM API costs sit on top, as with the others.

Hidden cost flags: Dify's knowledge-base ingestion consumes embedding tokens on every upload and re-embed — for a few thousand documents this is a one-time $5–$50 hit; for a live document pipeline it is a running cost worth modelling. Langflow's total cost is the hardest to estimate because you build and operate everything yourself — add 10–20 hours of platform work per quarter for patching, monitoring, and auth. FastGPT's preprocessing pipeline uses an internal model for layout analysis that is bundled in the OSS edition but consumes compute on ingest.$body7$,
  $body8$[
    {"persona":"Startup building a customer-facing AI chatbot","recommendedSlug":"dify","reasoning":"Dify's evaluation, observability, and agent tooling are the most production-ready. Ship on the Pro cloud tier to skip ops, migrate to self-host when scale justifies."},
    {"persona":"SaaS vendor embedding AI in a multi-tenant product","recommendedSlug":"langflow","reasoning":"Langflow's Apache 2.0 license is the only one of the three that permits multi-tenant SaaS commercialisation without restriction. Dify's license explicitly blocks this."},
    {"persona":"Enterprise team building an internal compliance-document Q&A tool","recommendedSlug":"fastgpt","reasoning":"FastGPT's ingestion pipeline handles messy PDFs and layout-heavy documents better than either alternative. For bounded Q&A over a document repository, FastGPT produces better results with less tuning."},
    {"persona":"Researcher prototyping novel agent architectures","recommendedSlug":"langflow","reasoning":"Langflow's visual canvas on top of LangChain lets you iterate on agent structure visually, then export to code. Dify's workflow is less malleable at the architecture level."},
    {"persona":"Non-technical founder trying to prototype quickly","recommendedSlug":"dify","reasoning":"Dify's web UI is the most non-technical-friendly — you can build a working chatbot in an afternoon without any YAML or code. Langflow requires more conceptual understanding of retrievers, chains, and agents."}
  ]$body8$::jsonb,
  $body9$[
    {"dimension":"GitHub stars","values":{"dify":{"score":"~75k","unit":"","source":"github.com/langgenius/dify"},"langflow":{"score":"~40k","unit":"","source":"github.com/langflow-ai/langflow"},"fastgpt":{"score":"~22k","unit":"","source":"github.com/labring/FastGPT"}}},
    {"dimension":"Built-in RAG","values":{"dify":{"score":"Yes","unit":"multi-source","source":"Dify docs"},"langflow":{"score":"Partial","unit":"component-based","source":"requires retriever config"},"fastgpt":{"score":"Yes","unit":"enterprise-doc","source":"FastGPT docs"}}},
    {"dimension":"Self-host deploy time","values":{"dify":{"score":"~10","unit":"min","source":"docker-compose up"},"langflow":{"score":"~5","unit":"min","source":"pip install + run"},"fastgpt":{"score":"~15","unit":"min","source":"docker-compose + mongo"}}},
    {"dimension":"Multi-tenant SaaS allowed","values":{"dify":{"score":"No","unit":"","source":"source-available license clause"},"langflow":{"score":"Yes","unit":"","source":"Apache 2.0"},"fastgpt":{"score":"Yes with attribution","unit":"","source":"FastGPT OSS license"}}},
    {"dimension":"Native observability","values":{"dify":{"score":"Built-in","unit":"","source":"app analytics panel"},"langflow":{"score":"Basic","unit":"","source":"node-level traces"},"fastgpt":{"score":"Basic","unit":"","source":"workflow logs"}}}
  ]$body9$::jsonb,
  $body10$[
    {"question":"Can I use Dify for a commercial SaaS?","answer":"Only for single-tenant commercial use (your own internal product, your own customers on your own instance). The Dify license explicitly forbids offering Dify itself as a hosted multi-tenant service to third parties. If you are building a multi-tenant AI SaaS, use Langflow or LangChain directly instead."},
    {"question":"Which has the best document Q&A quality?","answer":"FastGPT, typically. Its preprocessing pipeline handles PDF layouts, tables, and structured documents better than Dify's default ingest. Dify can match FastGPT's quality with careful chunking and re-ranking configuration, but out of the box FastGPT wins on messy enterprise documents."},
    {"question":"Is Langflow just a GUI on top of LangChain?","answer":"Largely yes — that is the design. Langflow components map to LangChain primitives, and flows export as runnable LangChain code. This is a strength (you inherit LangChain's ecosystem speed) and a weakness (you also inherit LangChain's abstractions, some of which are leaky)."},
    {"question":"Do these work offline or with local models?","answer":"All three support local models via Ollama or OpenAI-compatible endpoints. Quality drops with smaller local models but functionally all three can run fully local. FastGPT ships with the cleanest Ollama integration for its ingest pipeline."},
    {"question":"Which is best for a single developer building a personal AI tool?","answer":"Dify, in most cases. The web UI is the most approachable, the built-in RAG handles the annoying parts, and the free tier on cloud or self-host on a small VPS makes it zero-friction. Langflow is a close second if you want more architectural control."},
    {"question":"Can I migrate from one to another later?","answer":"Partially. RAG indexes and document uploads are tool-specific and would need re-ingestion. Prompt logic and workflow structure can be recreated but not imported directly between tools. Plan the migration at about 30–50% of the original build time if you need to switch."},
    {"question":"Which one supports agent tools (HTTP calls, code execution)?","answer":"Dify most fully, with native HTTP request nodes, code execution sandboxes, and many integrations. Langflow via LangChain tools (broad but sometimes fiddly). FastGPT has limited tool use — it is primarily a Q&A platform, not a general agent builder."}
  ]$body10$::jsonb,
  true,
  $body11$2026-04-21T00:00:00Z$body11$,
  $body12$2026-04-21T00:00:00Z$body12$,
  0
) ON CONFLICT (slug) DO NOTHING;

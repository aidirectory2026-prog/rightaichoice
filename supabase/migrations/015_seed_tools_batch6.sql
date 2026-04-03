-- ============================================================
-- RightAIChoice — Seed: Tools Batch 6 (55 tools)
-- Categories: Customer Support, Automation & Agents,
--             Business & Finance, Security & Privacy
-- Run AFTER previous migration files
-- ============================================================

-- ── CUSTOMER SUPPORT ────────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Intercom', 'intercom', 'AI-first customer messaging platform', 'Intercom is a leading customer messaging platform that uses AI to automate support, qualify leads, and onboard users. Its Fin AI agent can resolve up to 50% of support queries autonomously using your help center content. Features include live chat, product tours, help center, and outbound messaging.', 'https://intercom.com', 'paid', '[{"plan":"Essential","price":"$39/seat/mo","features":["Shared inbox","Basic automation","Help center"]},{"plan":"Advanced","price":"$99/seat/mo","features":["Fin AI agent","Workflows","Multiple inboxes"]},{"plan":"Expert","price":"$139/seat/mo","features":["SSO","Custom roles","Workload management"]}]', 'intermediate', true, '{web,mobile,api}', '{"Fin AI agent","Live chat messenger","Product tours","Help center builder","Outbound messaging","Custom bots","Reporting dashboards","Ticket management"}', '{"Salesforce","Slack","HubSpot","Stripe"}', 'https://developers.intercom.com', true, '{"SaaS companies","Customer success teams","Growth-stage startups"}', '{"Small teams on tight budgets","Simple email-only support"}', 'Intercom is the gold standard for in-app customer messaging. Fin AI is genuinely impressive, but the per-seat pricing adds up fast for larger teams.', now()),

('Zendesk', 'zendesk', 'Enterprise customer service platform with AI', 'Zendesk is the industry-standard customer service platform used by over 100,000 businesses. AI features include intelligent triage, AI-powered agent assist, and generative AI for ticket responses. Supports email, chat, phone, social, and self-service across a unified workspace.', 'https://zendesk.com', 'paid', '[{"plan":"Suite Team","price":"$55/agent/mo","features":["Ticketing","Chat","Help center"]},{"plan":"Suite Growth","price":"$89/agent/mo","features":["AI triage","Self-service portal","SLA management"]},{"plan":"Suite Professional","price":"$115/agent/mo","features":["Custom analytics","Skills-based routing","AI agents"]}]', 'intermediate', true, '{web,mobile,api}', '{"AI-powered triage","Omnichannel ticketing","Agent workspace","Help center","Answer bot","Live chat","Voice support","Custom analytics"}', '{"Salesforce","Slack","Shopify","Jira"}', 'https://developer.zendesk.com', true, '{"Enterprise support teams","Omnichannel contact centers","E-commerce companies"}', '{"Solo founders","Startups under 10 employees"}', 'Zendesk remains the enterprise default for good reason — rock-solid reliability and deep integrations. The AI features are improving but still trail Intercom Fin for autonomous resolution.', now()),

('Freshdesk', 'freshdesk', 'Helpdesk with Freddy AI for smarter support', 'Freshdesk by Freshworks offers a full helpdesk platform with Freddy AI for auto-triage, canned response suggestions, and AI-powered chatbots. The free plan supports up to 10 agents. Features include ticketing, SLA management, a knowledge base, and collaboration tools.', 'https://freshdesk.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Up to 10 agents","Email ticketing","Knowledge base"]},{"plan":"Growth","price":"$15/agent/mo","features":["Automation","SLA management","Marketplace apps"]},{"plan":"Pro","price":"$49/agent/mo","features":["Freddy AI","Round-robin routing","Custom reports"]}]', 'beginner', true, '{web,mobile,api}', '{"Freddy AI assistant","Ticket management","SLA policies","Knowledge base","Team collaboration","Automations","Customer satisfaction surveys","Multi-channel support"}', '{"Slack","Shopify","Salesforce","Jira"}', 'https://developers.freshdesk.com', true, '{"Small to midsize support teams","Budget-conscious businesses","Teams wanting a free tier"}', '{"Enterprise needing advanced AI agents","Complex multi-brand setups"}', 'Freshdesk is an excellent value proposition — a generous free tier and capable AI at lower price points than Zendesk. Freddy AI is solid but not best-in-class for autonomous resolution.', now()),

('Tidio', 'tidio', 'AI chatbot and live chat for e-commerce support', 'Tidio combines live chat, AI chatbots, and email in one platform designed for e-commerce. Its Lyro AI chatbot learns from your FAQ content and can handle up to 70% of routine customer queries. Features include visual chatbot builder, visitor tracking, and Shopify integration.', 'https://tidio.com', 'freemium', '[{"plan":"Free","price":"$0","features":["50 conversations/mo","Live chat","Basic chatbot"]},{"plan":"Starter","price":"$29/mo","features":["100 conversations","Analytics","Live typing"]},{"plan":"Tidio+","price":"$394/mo","features":["Lyro AI","Custom limits","Dedicated support"]}]', 'beginner', true, '{web,mobile,api}', '{"Lyro AI chatbot","Visual chatbot builder","Live chat widget","Visitor tracking","Email integration","Shopify integration","Order management","Canned responses"}', '{"Shopify","WordPress","WooCommerce","Zapier"}', 'https://tidio.com/docs', true, '{"E-commerce stores","Small business websites","Shopify merchants"}', '{"Enterprise contact centers","B2B SaaS with complex queries"}', 'Tidio is one of the best chatbot options for e-commerce shops. Lyro AI is genuinely useful for deflecting FAQs, but the jump to the AI tier is steep.', now()),

('Drift', 'drift', 'Conversational AI platform for B2B sales', 'Drift is a conversational marketing and sales platform now part of Salesloft. It uses AI chatbots to qualify leads, book meetings, and route conversations to the right sales rep in real time. Features include playbooks, ABM targeting, and revenue orchestration for B2B teams.', 'https://drift.com', 'contact', '[{"plan":"Premium","price":"Contact sales","features":["Live chat","Chatbots","Meetings"]},{"plan":"Advanced","price":"Contact sales","features":["AI-powered chatbots","ABM targeting","Fastlane"]},{"plan":"Enterprise","price":"Contact sales","features":["Custom AI","Workspaces","Advanced routing"]}]', 'intermediate', true, '{web,api}', '{"AI chatbots","Meeting scheduling","Lead qualification","Playbooks","ABM targeting","Revenue orchestration","Conversational landing pages","Analytics"}', '{"Salesforce","HubSpot","Marketo","Outreach"}', 'https://devdocs.drift.com', true, '{"B2B sales teams","Demand generation teams","Account-based marketing"}', '{"E-commerce stores","B2C customer support"}', 'Drift pioneered conversational marketing and remains the leader for B2B pipeline generation. Expensive, but the meeting booking and lead routing AI delivers real ROI for sales teams.', now()),

('Ada', 'ada-cx', 'AI-powered customer service automation platform', 'Ada is an AI customer service platform that builds automated chatbots trained on your knowledge base. It can resolve over 70% of inquiries without human intervention across chat, email, voice, and social channels. Features include no-code bot building, multilingual support, and handoff to live agents.', 'https://ada.cx', 'contact', '[{"plan":"Core","price":"Contact sales","features":["AI chatbot","Knowledge integration","Basic analytics"]},{"plan":"Advanced","price":"Contact sales","features":["Generative AI","Omnichannel","API actions"]},{"plan":"Pro","price":"Contact sales","features":["Custom AI models","Advanced integrations","Dedicated CSM"]}]', 'beginner', true, '{web,mobile,api}', '{"Generative AI responses","No-code bot builder","Multilingual support","Omnichannel deployment","Handoff to agents","Knowledge base integration","Analytics dashboard","API actions"}', '{"Zendesk","Salesforce","Contentful","Twilio"}', 'https://ada.cx/docs', true, '{"Enterprise customer service teams","Companies with high ticket volume","Multilingual support needs"}', '{"Small businesses","Teams wanting a free tier"}', 'Ada is among the best enterprise AI chatbot platforms available. The resolution rates are genuinely high, but this is a premium product with enterprise pricing to match.', now()),

('Chatbase', 'chatbase', 'Custom ChatGPT chatbot for your website', 'Chatbase lets you build a custom AI chatbot trained on your own data — documents, websites, or text. It creates a ChatGPT-like assistant you can embed on your website to answer visitor questions. Features include lead capture, analytics, and customizable appearance.', 'https://chatbase.co', 'freemium', '[{"plan":"Free","price":"$0","features":["1 chatbot","30 messages/mo","400k chars"]},{"plan":"Hobby","price":"$19/mo","features":["2 chatbots","2000 messages","11M chars"]},{"plan":"Standard","price":"$99/mo","features":["5 chatbots","10k messages","Custom domains"]}]', 'beginner', true, '{web,api}', '{"Custom data training","Website embedding","Lead capture forms","Conversation analytics","Customizable appearance","Multiple data sources","API access","Slack integration"}', '{"Slack","WhatsApp","Zapier","WordPress"}', 'https://chatbase.co/docs', true, '{"Website owners wanting AI chat","Small businesses","Content-heavy sites"}', '{"Enterprise with complex routing needs","Real-time transactional support"}', 'Chatbase is the fastest way to get a GPT-powered chatbot on your website. Training on your own data works surprisingly well, though complex multi-turn conversations can still falter.', now()),

('Botpress', 'botpress', 'Open source chatbot and conversational AI builder', 'Botpress is an open-source platform for building AI-powered chatbots and conversational assistants. It features a visual flow builder, built-in NLU, and GPT-native capabilities. The cloud version offers hosting and analytics, while self-hosted gives full control over data and deployment.', 'https://botpress.com', 'freemium', '[{"plan":"Free","price":"$0","features":["5 bots","2000 messages/mo","Community support"]},{"plan":"Team","price":"$495/mo","features":["20 bots","Unlimited messages","Priority support"]},{"plan":"Enterprise","price":"Contact sales","features":["Unlimited bots","SSO","SLA"]}]', 'intermediate', true, '{web,self-hosted,api}', '{"Visual flow builder","Built-in NLU","GPT-native AI","Knowledge base Q&A","Multi-channel deployment","Self-hosted option","Analytics dashboard","Developer SDK"}', '{"Slack","Microsoft Teams","WhatsApp","Telegram"}', 'https://botpress.com/docs', true, '{"Developers building chatbots","Teams wanting open-source control","Multi-channel bot deployments"}', '{"Non-technical users","Simple FAQ-only needs"}', 'Botpress is the best open-source chatbot builder available. The GPT integration makes it genuinely powerful, though the learning curve is steeper than no-code alternatives like Chatbase.', now()),

('Voiceflow', 'voiceflow', 'Collaborative platform for designing conversational AI', 'Voiceflow is a collaborative design platform for building conversational AI experiences across chat, voice, and custom channels. Features include a visual canvas for dialogue design, API integrations, knowledge base management, and team collaboration. Used by enterprise teams building complex AI assistants.', 'https://voiceflow.com', 'freemium', '[{"plan":"Sandbox","price":"$0","features":["2 agents","Limited usage","Community support"]},{"plan":"Pro","price":"$50/editor/mo","features":["Unlimited agents","API access","Analytics"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Custom integrations","SLA"]}]', 'intermediate', true, '{web,api}', '{"Visual conversation canvas","Knowledge base management","Multi-channel deployment","API step builder","Team collaboration","Version control","Analytics","Custom functions"}', '{"Zendesk","Twilio","Zapier","Google Sheets"}', 'https://developer.voiceflow.com', true, '{"Conversation designers","Enterprise AI assistant teams","Voice and chat bot builders"}', '{"Simple FAQ chatbot needs","Non-technical solo users"}', 'Voiceflow is the Figma of conversational AI design. The collaborative canvas is excellent for teams, but it is overkill if you just need a simple FAQ bot.', now()),

('Crisp', 'crisp', 'All-in-one business messaging platform', 'Crisp is a business messaging platform that unifies live chat, email, and social messaging in one shared inbox. Features include an AI chatbot (MagicReply), knowledge base, CRM, and co-browsing. The free plan supports 2 operators, making it accessible for small teams.', 'https://crisp.chat', 'freemium', '[{"plan":"Free","price":"$0","features":["2 operators","Live chat","Contact form"]},{"plan":"Pro","price":"$25/mo/workspace","features":["4 operators","Chatbot","Triggers"]},{"plan":"Unlimited","price":"$95/mo/workspace","features":["Unlimited operators","AI MagicReply","Knowledge base"]}]', 'beginner', true, '{web,mobile,api}', '{"MagicReply AI","Shared inbox","Live chat widget","Knowledge base","CRM","Co-browsing","Chatbot builder","Campaign messaging"}', '{"Slack","WordPress","Shopify","Zapier"}', 'https://docs.crisp.chat', true, '{"Small businesses","Startups","E-commerce stores needing multi-channel support"}', '{"Large enterprise contact centers","Teams needing phone support"}', 'Crisp punches above its weight with a generous free tier and solid feature set. MagicReply AI is a nice addition, though not as sophisticated as Intercom Fin.', now()),

('LiveChat', 'livechat', 'Live chat software with AI-powered assist', 'LiveChat is a dedicated live chat platform used by over 37,000 businesses. Features include chat widgets, ticketing, AI-powered reply suggestions, chat routing, and detailed analytics. Integrates with 200+ tools including CRM, e-commerce, and helpdesk platforms.', 'https://livechat.com', 'paid', '[{"plan":"Starter","price":"$20/agent/mo","features":["60-day chat history","Basic widget","Ticketing"]},{"plan":"Team","price":"$41/agent/mo","features":["Unlimited history","Full customization","Reporting"]},{"plan":"Business","price":"$59/agent/mo","features":["Work scheduler","Staffing prediction","Apple Messages"]}]', 'beginner', true, '{web,desktop,mobile,api}', '{"AI reply suggestions","Chat widget customization","Ticketing system","Chat routing","Canned responses","Visitor analytics","File sharing","Chat ratings"}', '{"Salesforce","HubSpot","Shopify","WhatsApp"}', 'https://developers.livechat.com', true, '{"E-commerce support teams","Sales teams using live chat","Businesses wanting reliable chat software"}', '{"Teams needing AI-first automation","Budget-constrained solo operators"}', 'LiveChat is rock-solid and battle-tested for live chat. The AI assist features are helpful but incremental — this is primarily a human-agent platform with AI as a supplement.', now()),

('Customerly', 'customerly', 'AI-powered customer service and marketing suite', 'Customerly is an all-in-one customer service platform with AI-powered chatbots, live chat, email marketing, and customer satisfaction surveys. Its AI assistant, Aura, can handle conversations autonomously using your knowledge base and hand off to humans when needed.', 'https://customerly.io', 'freemium', '[{"plan":"Free","price":"$0","features":["Live chat","Basic CRM","Limited conversations"]},{"plan":"Essential","price":"$9/mo","features":["3 teammates","Chat widget","Surveys"]},{"plan":"Startup","price":"$49/mo","features":["Aura AI","Knowledge base","Automation"]}]', 'beginner', true, '{web,mobile,api}', '{"Aura AI assistant","Live chat","Email marketing","Knowledge base","Customer surveys","Video live chat","Chat funnels","Help center"}', '{"Slack","Zapier","WordPress","Shopify"}', 'https://docs.customerly.io', true, '{"Small SaaS companies","Startups needing all-in-one support","Teams wanting AI plus email marketing"}', '{"Enterprise with complex routing","Teams needing phone support"}', 'Customerly is a solid all-in-one option for small teams that want chat, email marketing, and AI in a single tool. Aura AI works well for common queries but lacks the depth of dedicated platforms.', now()),

('Kommunicate', 'kommunicate', 'AI chatbot platform with human handoff', 'Kommunicate is a customer support automation platform that combines AI chatbots with a helpdesk. It integrates with Dialogflow, IBM Watson, and GPT to build intelligent bots, and features seamless handoff to human agents. Supports web, mobile, and messaging channels.', 'https://kommunicate.io', 'freemium', '[{"plan":"Free","price":"$0","features":["30-day trial","2 teammates","Basic bot"]},{"plan":"Lite","price":"$40/mo","features":["2 teammates","Kompose bot builder","Integrations"]},{"plan":"Advanced","price":"$100/mo","features":["5 teammates","Custom bots","Priority support"]}]', 'beginner', true, '{web,mobile,api}', '{"AI chatbot builder","Human handoff","Dialogflow integration","FAQ bot","Rich messaging","Mobile SDK","CSAT ratings","Dashboard analytics"}', '{"Dialogflow","Zendesk","Salesforce","WhatsApp"}', 'https://docs.kommunicate.io', true, '{"Mobile app developers","Teams using Dialogflow","SMBs wanting chatbot plus helpdesk"}', '{"Enterprise with complex workflows","Teams needing email-only support"}', 'Kommunicate is a good middle-ground between building your own chatbot and paying for enterprise platforms. The Dialogflow integration is a strong differentiator for teams already in the Google ecosystem.', now()),

('HelpScout', 'helpscout', 'Customer support platform with AI email drafts', 'Help Scout is a help desk built for growing teams that want a human, personal approach to support. Features include shared inbox, knowledge base, live chat (Beacon), and AI-powered draft replies. The AI Summarize and AI Assist features help agents respond faster and more consistently.', 'https://helpscout.com', 'paid', '[{"plan":"Standard","price":"$20/user/mo","features":["2 mailboxes","Email and chat","AI drafts"]},{"plan":"Plus","price":"$40/user/mo","features":["5 mailboxes","Advanced permissions","Custom fields"]},{"plan":"Pro","price":"$65/user/mo","features":["25 mailboxes","Enterprise security","Concierge onboarding"]}]', 'beginner', true, '{web,mobile,api}', '{"AI draft replies","AI Summarize","Shared inbox","Beacon live chat","Knowledge base","Saved replies","Collision detection","Customer satisfaction ratings"}', '{"Slack","HubSpot","Salesforce","Jira"}', 'https://developer.helpscout.com', true, '{"Growing SaaS teams","Teams valuing personal support","Small businesses scaling support"}', '{"High-volume contact centers","Teams needing AI-first automation"}', 'Help Scout is the best help desk for teams that believe support should feel personal. AI features enhance rather than replace human agents, which is refreshing but means lower deflection rates.', now()),

('Kayako', 'kayako', 'Unified customer service platform', 'Kayako is a customer service platform that unifies email, live chat, social media, and self-service into a single view. It provides a complete customer journey timeline so agents have full context. Features include SingleView for customer history, automated workflows, and collaboration tools.', 'https://kayako.com', 'contact', '[{"plan":"Essential","price":"Contact sales","features":["Ticketing","Live chat","Single inbox"]},{"plan":"Enterprise","price":"Contact sales","features":["Custom roles","Advanced automation","SLA management"]}]', 'intermediate', true, '{web,api}', '{"SingleView customer timeline","Unified inbox","Live chat","Help center","Automated workflows","Collision detection","SLA tracking","Customer journey mapping"}', '{"Salesforce","Slack","Zapier","Stripe"}', 'https://developer.kayako.com', true, '{"Mid-market support teams","Teams wanting customer journey visibility","Multi-channel support operations"}', '{"Startups on a budget","Teams wanting AI-first automation"}', 'Kayako offers a strong unified view of the customer journey, which is its real differentiator. However, the AI capabilities lag behind competitors like Intercom and Zendesk.', now());

-- ── AUTOMATION & AGENTS ─────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('AgentGPT', 'agentgpt', 'Autonomous AI agents that run in your browser', 'AgentGPT lets you create autonomous AI agents directly in your browser. Give it a goal and it will devise a plan, execute tasks, and iterate toward completion. Built on GPT-4, it can research topics, write code, and perform multi-step tasks without manual intervention.', 'https://agentgpt.reworkd.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Limited runs","GPT-3.5","Basic agents"]},{"plan":"Pro","price":"$40/mo","features":["GPT-4","Unlimited agents","Advanced tools"]}]', 'intermediate', false, '{web}', '{"Autonomous task execution","Goal-based planning","Web browsing","Code generation","Multi-step reasoning","Browser-based interface","Task history","Agent templates"}', '{"OpenAI API","Web search"}', 'https://docs.reworkd.ai', true, '{"AI enthusiasts exploring agents","Researchers","Developers prototyping autonomous workflows"}', '{"Production business workflows","Non-technical users","Mission-critical tasks"}', 'AgentGPT is a fascinating playground for autonomous AI agents. Fun to experiment with, but not yet reliable enough for production use — agents often loop or lose track of goals.', now()),

('AutoGPT', 'autogpt', 'Open source autonomous AI agent framework', 'AutoGPT is the pioneering open-source project that demonstrated autonomous AI agents. It chains GPT-4 calls with memory, web browsing, and file operations to accomplish goals independently. Now evolving into a platform with a marketplace for agent templates and plugins.', 'https://autogpt.net', 'free', '[{"plan":"Open Source","price":"$0","features":["Full source code","Self-hosted","Community plugins"]}]', 'advanced', true, '{self-hosted,api}', '{"Autonomous goal pursuit","Long-term memory","Web browsing","File operations","Plugin ecosystem","Self-prompting chains","Code execution","Agent marketplace"}', '{"OpenAI API","Google Search","GitHub"}', 'https://docs.agpt.co', true, '{"Developers building AI agents","Open source contributors","AI researchers"}', '{"Non-technical users","Teams wanting managed solutions","Production deployments"}', 'AutoGPT was the project that launched the AI agent wave. The open-source codebase is invaluable for learning, but expect significant tinkering to get reliable results.', now()),

('CrewAI', 'crewai', 'Framework for orchestrating multi-agent AI teams', 'CrewAI is a Python framework for orchestrating role-playing AI agents that work together on complex tasks. Define agents with specific roles, goals, and tools, then assemble them into crews that collaborate. Supports sequential and hierarchical task delegation patterns.', 'https://crewai.com', 'freemium', '[{"plan":"Open Source","price":"$0","features":["Full framework","Unlimited agents","Community support"]},{"plan":"Enterprise","price":"Contact sales","features":["CrewAI+","Managed hosting","Support"]}]', 'advanced', true, '{self-hosted,api}', '{"Multi-agent orchestration","Role-based agents","Sequential and hierarchical processes","Custom tool integration","Memory and context sharing","Task delegation","Python framework","Agent collaboration"}', '{"OpenAI","Anthropic","LangChain","HuggingFace"}', 'https://docs.crewai.com', true, '{"Python developers building agent systems","AI engineers","Teams needing multi-agent workflows"}', '{"Non-coders","Simple single-agent use cases","Beginners to AI"}', 'CrewAI is the most elegant multi-agent framework available. The role-playing paradigm makes agent design intuitive, though you need solid Python skills to get the most from it.', now()),

('Bardeen', 'bardeen', 'AI-powered browser automation for repetitive tasks', 'Bardeen is a browser automation tool that uses AI to automate repetitive tasks across web apps. Create automations by describing what you want in natural language, or use the visual workflow builder. Features include web scraping, data entry automation, and cross-app workflows.', 'https://bardeen.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited non-premium runs","Builder","Community automations"]},{"plan":"Professional","price":"$10/mo","features":["Premium integrations","AI credits","Priority support"]}]', 'beginner', true, '{plugin,web}', '{"Natural language automation","Visual workflow builder","Web scraping","Data entry automation","Cross-app workflows","Chrome extension","Scheduled runs","AI suggestions"}', '{"Google Sheets","Slack","Notion","HubSpot"}', 'https://docs.bardeen.ai', true, '{"Knowledge workers automating repetitive tasks","Sales teams","Recruiters"}', '{"Complex enterprise integrations","Backend server automation"}', 'Bardeen is impressively easy to use — the natural language automation builder genuinely works. Best for personal productivity automation rather than team-scale workflows.', now()),

('Tray.io', 'tray-io', 'Enterprise AI-powered integration and automation', 'Tray.io is an enterprise-grade integration platform that connects your entire tech stack with AI-powered automation. Features include a visual workflow builder, Merlin AI for building automations from natural language, and universal connectors for hundreds of apps.', 'https://tray.io', 'contact', '[{"plan":"Pro","price":"Contact sales","features":["Visual builder","Core connectors","5 workflows"]},{"plan":"Team","price":"Contact sales","features":["Unlimited workflows","Custom connectors","Collaboration"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Advanced governance","SLA"]}]', 'intermediate', true, '{web,api}', '{"Merlin AI builder","Visual workflow editor","Universal API connector","Data transformation","Error handling","Conditional logic","Scheduled triggers","Enterprise governance"}', '{"Salesforce","Slack","HubSpot","Snowflake"}', 'https://tray.io/documentation', true, '{"Enterprise IT teams","RevOps teams","Companies with complex tech stacks"}', '{"Solo users","Small businesses on a budget","Simple Zapier-level automations"}', 'Tray.io is a serious enterprise integration platform with genuine AI capabilities. Merlin AI makes complex workflows accessible, but the enterprise pricing puts it out of reach for small teams.', now()),

('Workato', 'workato', 'Enterprise automation and integration with AI', 'Workato is an enterprise integration and automation platform that connects over 1000 apps with AI-powered recipe building. Features include Workbot for conversational automation, intelligent data mapping, and enterprise-grade security. Used by Fortune 500 companies for complex business process automation.', 'https://workato.com', 'contact', '[{"plan":"Professional","price":"Contact sales","features":["Core connectors","Recipe building","Community recipes"]},{"plan":"Business","price":"Contact sales","features":["Advanced connectors","Workbot","Teams"]},{"plan":"Enterprise","price":"Contact sales","features":["Custom SLA","Advanced security","Dedicated support"]}]', 'intermediate', true, '{web,api}', '{"1000+ app connectors","AI recipe builder","Workbot conversational automation","Intelligent data mapping","Enterprise security","Recipe lifecycle management","Error handling","Real-time triggers"}', '{"Salesforce","SAP","Workday","ServiceNow"}', 'https://docs.workato.com', true, '{"Enterprise IT and ops teams","Companies automating complex business processes","RevOps teams"}', '{"Small businesses","Individual users","Simple automation needs"}', 'Workato is arguably the most powerful enterprise automation platform. The AI recipe builder genuinely reduces development time, but this is squarely an enterprise product in pricing and complexity.', now()),

('Power Automate', 'power-automate', 'Microsoft low-code automation platform', 'Power Automate (formerly Microsoft Flow) is Microsofts low-code automation platform for building workflows across Microsoft 365 and hundreds of third-party services. Features include AI Builder for no-code AI models, robotic process automation (RPA), and process mining.', 'https://powerautomate.microsoft.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Limited flows","Standard connectors","Microsoft 365"]},{"plan":"Per User","price":"$15/user/mo","features":["Unlimited flows","Premium connectors","AI Builder"]},{"plan":"Per Flow","price":"$100/flow/mo","features":["Unlimited users","RPA","Process mining"]}]', 'beginner', true, '{web,desktop,api}', '{"AI Builder","Desktop RPA","Cloud flows","Process mining","Adaptive cards","Premium connectors","Approval workflows","Document processing"}', '{"Microsoft 365","SharePoint","Dynamics 365","Teams"}', 'https://learn.microsoft.com/power-automate', true, '{"Microsoft ecosystem businesses","Enterprises using Office 365","Teams wanting low-code RPA"}', '{"Non-Microsoft shops","Teams wanting open-source solutions","Simple personal automation"}', 'Power Automate is a no-brainer for Microsoft-heavy organizations. AI Builder adds genuine value, but the platform feels clunky compared to modern alternatives if you are not in the Microsoft ecosystem.', now()),

('Activepieces', 'activepieces', 'Open source no-code automation platform', 'Activepieces is an open-source automation platform that rivals Zapier with a beautiful no-code interface. Build workflows connecting 100+ apps with triggers, actions, and branching logic. Can be self-hosted for full data control or used as a cloud service.', 'https://activepieces.com', 'freemium', '[{"plan":"Free","price":"$0","features":["1000 tasks/mo","Community pieces","Cloud hosted"]},{"plan":"Pro","price":"$10/mo","features":["10k tasks","Premium support","Custom domains"]},{"plan":"Self-Hosted","price":"$0","features":["Unlimited tasks","Full control","Community support"]}]', 'beginner', true, '{web,self-hosted,api}', '{"Visual flow builder","100+ app connectors","Self-hosted option","Branching logic","Webhooks","Scheduled triggers","Community pieces marketplace","Open source codebase"}', '{"Google Sheets","Slack","OpenAI","Discord"}', 'https://activepieces.com/docs', true, '{"Developers wanting open-source Zapier","Privacy-conscious teams","Budget-minded automators"}', '{"Enterprise needing 1000+ connectors","Non-technical users wanting polished UX"}', 'Activepieces is the most promising open-source Zapier alternative. The UI is clean, the community is growing, and the self-hosted option is perfect for data-sensitive teams.', now()),

('Pipedream', 'pipedream', 'Developer-first workflow automation platform', 'Pipedream is a developer-first automation platform where you connect APIs with code-level control. Write Node.js, Python, Go, or Bash steps alongside no-code integrations. Features include a generous free tier, event-driven architecture, and access to 1000+ API integrations.', 'https://pipedream.com', 'freemium', '[{"plan":"Free","price":"$0","features":["100 credits/day","Unlimited workflows","All integrations"]},{"plan":"Basic","price":"$29/mo","features":["2000 credits/day","Longer history","Priority support"]},{"plan":"Advanced","price":"$59/mo","features":["5000 credits/day","Team features","SSO"]}]', 'advanced', true, '{web,api}', '{"Code + no-code steps","1000+ integrations","Event-driven architecture","Node.js and Python support","HTTP endpoints","Scheduled triggers","Data stores","Version control"}', '{"GitHub","Slack","OpenAI","Google Sheets"}', 'https://pipedream.com/docs', true, '{"Developers automating API workflows","Technical teams","Backend automation builders"}', '{"Non-technical users","Teams wanting pure no-code","Simple automation needs"}', 'Pipedream is the best automation platform for developers who want code-level control. The free tier is generous and the hybrid code/no-code approach is uniquely powerful.', now()),

('Clay', 'clay', 'AI-powered data enrichment and outbound automation', 'Clay is a data enrichment and outbound automation platform for go-to-market teams. It pulls data from 75+ providers, uses AI to research prospects, and automates personalized outreach. Features include waterfall enrichment, AI message writing, and CRM syncing.', 'https://clay.com', 'freemium', '[{"plan":"Free","price":"$0","features":["100 credits/mo","Limited tables","Basic enrichment"]},{"plan":"Starter","price":"$149/mo","features":["2000 credits","CRM integration","Basic AI"]},{"plan":"Explorer","price":"$349/mo","features":["10k credits","Advanced AI","Team features"]}]', 'intermediate', true, '{web,api}', '{"75+ data enrichment providers","AI prospect research","Waterfall enrichment","Personalized message writing","CRM syncing","CSV import/export","Automated workflows","Lead scoring"}', '{"Salesforce","HubSpot","Outreach","Apollo"}', 'https://docs.clay.com', true, '{"Sales development teams","Growth teams","Revenue operations"}', '{"Non-sales use cases","Small businesses without outbound motion"}', 'Clay has become the secret weapon of top SDR teams. The waterfall enrichment across 75+ providers is uniquely powerful, and AI-written personalization actually works.', now()),

('PhantomBuster', 'phantombuster', 'Growth automation for lead generation and outreach', 'PhantomBuster provides ready-made automation scripts (Phantoms) for lead generation across LinkedIn, Twitter, Instagram, and other platforms. Extract data from profiles, auto-connect on LinkedIn, scrape search results, and automate outreach sequences without coding.', 'https://phantombuster.com', 'paid', '[{"plan":"Starter","price":"$56/mo","features":["5 slots","10k AI credits","20h execution"]},{"plan":"Pro","price":"$128/mo","features":["15 slots","30k AI credits","80h execution"]},{"plan":"Team","price":"$352/mo","features":["50 slots","90k AI credits","300h execution"]}]', 'intermediate', false, '{web}', '{"LinkedIn automation","Lead extraction","Auto-connect and messaging","Multi-platform scraping","Outreach sequences","Data enrichment","CRM export","Scheduled Phantoms"}', '{"LinkedIn","Sales Navigator","HubSpot","Google Sheets"}', 'https://phantombuster.com/docs', true, '{"Lead generation teams","Growth hackers","Recruiters sourcing candidates"}', '{"Enterprise compliance-strict teams","Users unfamiliar with web scraping ethics"}', 'PhantomBuster is incredibly effective for LinkedIn and social lead generation. Powerful but use responsibly — aggressive automation can get your accounts flagged.', now()),

('Browse AI', 'browse-ai', 'AI web scraping and monitoring without code', 'Browse AI turns any website into a structured data source without coding. Train a robot by clicking on the data you want, and it will extract and monitor it on a schedule. Features include change detection, bulk extraction, and integration with spreadsheets and automation tools.', 'https://browse.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["5 robots","50 runs/mo","Basic extraction"]},{"plan":"Starter","price":"$19/mo","features":["10 robots","200 runs","Monitoring"]},{"plan":"Professional","price":"$99/mo","features":["50 robots","2000 runs","Priority support"]}]', 'beginner', false, '{web}', '{"Point-and-click training","Scheduled extraction","Change monitoring","Bulk data extraction","Spreadsheet export","API access","Pre-built robots","Multi-page scraping"}', '{"Google Sheets","Zapier","Airtable","Notion"}', 'https://docs.browse.ai', true, '{"Market researchers","E-commerce teams tracking competitors","Non-technical data collectors"}', '{"Developers wanting custom scrapers","Real-time data needs"}', 'Browse AI makes web scraping genuinely accessible to non-developers. The point-and-click training works well for structured sites, though it struggles with highly dynamic JavaScript-heavy pages.', now()),

('Axiom', 'axiom-ai', 'No-code browser automation and web scraping', 'Axiom is a no-code browser automation tool that records your actions and replays them as automated workflows. Use it for web scraping, form filling, data entry, and repetitive browser tasks. Features include scheduling, data extraction to Google Sheets, and conditional logic.', 'https://axiom.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Limited automations","Basic recording","Community support"]},{"plan":"Starter","price":"$15/mo","features":["Unlimited automations","Scheduling","Cloud runs"]},{"plan":"Pro","price":"$50/mo","features":["Priority support","Advanced features","Team sharing"]}]', 'beginner', false, '{plugin}', '{"Record and replay automation","Web scraping","Form auto-filling","Scheduled runs","Google Sheets integration","Conditional logic","Data extraction","Chrome extension"}', '{"Google Sheets","Zapier","Webhooks","Airtable"}', 'https://docs.axiom.ai', true, '{"Non-technical users automating browser tasks","Small businesses","Data entry automation"}', '{"Complex enterprise workflows","Server-side automation"}', 'Axiom is the simplest browser automation tool out there — just record and replay. Perfect for non-technical users, though it cannot handle complex branching workflows as well as Bardeen.', now()),

('Relevance AI', 'relevance-ai', 'Build and deploy AI agents without code', 'Relevance AI is a platform for building, deploying, and managing AI agents and tools without code. Create AI-powered workflows that can research, analyze data, generate content, and take actions. Features include a tool builder, agent builder, and knowledge base integration.', 'https://relevanceai.com', 'freemium', '[{"plan":"Free","price":"$0","features":["100 credits/day","Basic tools","Community support"]},{"plan":"Team","price":"$19/user/mo","features":["Unlimited tools","Priority support","Integrations"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Custom models","Dedicated support"]}]', 'intermediate', true, '{web,api}', '{"No-code agent builder","AI tool builder","Knowledge base integration","Multi-step workflows","API connections","Template library","Team collaboration","Agent deployment"}', '{"OpenAI","Google Drive","Zapier","HubSpot"}', 'https://docs.relevanceai.com', true, '{"Operations teams building AI workflows","Non-technical AI builders","Teams wanting custom AI agents"}', '{"Developers wanting code-level control","Simple chatbot needs"}', 'Relevance AI is one of the best no-code AI agent builders available. The tool and agent builder paradigm is intuitive, making it accessible to non-developers who want genuine AI automation.', now()),

('Superagent', 'superagent', 'Open source framework for building AI agents', 'Superagent is an open-source framework for building, deploying, and managing AI agents. It supports tool use, RAG, memory, and multi-agent collaboration. Features include a hosted cloud option, REST API, and SDKs for Python and JavaScript.', 'https://superagent.sh', 'freemium', '[{"plan":"Open Source","price":"$0","features":["Full framework","Self-hosted","Community support"]},{"plan":"Cloud","price":"$29/mo","features":["Managed hosting","API access","Priority support"]}]', 'advanced', true, '{web,self-hosted,api}', '{"Multi-agent collaboration","Tool use and function calling","RAG integration","Long-term memory","REST API","Python and JS SDKs","Vector store support","Streaming responses"}', '{"OpenAI","Anthropic","Pinecone","LangChain"}', 'https://docs.superagent.sh', true, '{"Developers building agent applications","AI engineers","Open source contributors"}', '{"Non-technical users","Teams wanting no-code solutions","Simple automation needs"}', 'Superagent is a clean, well-designed open-source agent framework. The hosted cloud option lowers the barrier to entry, though it is still primarily a developer tool.', now());

-- ── BUSINESS & FINANCE ──────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Fireflies.ai', 'fireflies-ai', 'AI meeting transcription and conversation intelligence', 'Fireflies.ai automatically records, transcribes, and summarizes meetings across Zoom, Google Meet, Teams, and other platforms. Features include AI-powered search across meetings, action item extraction, topic tracking, and CRM integration for sales teams.', 'https://fireflies.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited transcription","800 min storage","AI summaries"]},{"plan":"Pro","price":"$10/seat/mo","features":["Unlimited storage","CRM integration","Custom vocabulary"]},{"plan":"Business","price":"$19/seat/mo","features":["Video recording","Conversation intelligence","API"]}]', 'beginner', true, '{web,mobile,api}', '{"Auto meeting recording","AI transcription","Smart search across meetings","Action item extraction","Topic tracking","CRM integration","Custom vocabulary","Meeting analytics"}', '{"Zoom","Google Meet","Microsoft Teams","Salesforce"}', 'https://docs.fireflies.ai', true, '{"Sales teams","Remote teams","Anyone wanting meeting records"}', '{"Teams preferring no meeting recordings","Offline-first organizations"}', 'Fireflies.ai offers the best value in AI meeting transcription. The free tier is generous, transcription accuracy is strong, and the smart search across all meetings is genuinely useful.', now()),

('Fathom', 'fathom', 'Free AI meeting assistant with instant summaries', 'Fathom is a free AI meeting assistant that records, transcribes, and summarizes Zoom, Google Meet, and Teams calls. Known for its fast, accurate summaries and the ability to highlight key moments during a call. The free plan includes unlimited recordings with no time limits.', 'https://fathom.video', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited recordings","AI summaries","Highlights"]},{"plan":"Premium","price":"$15/user/mo","features":["CRM sync","Team features","Custom templates"]}]', 'beginner', false, '{web,desktop}', '{"Instant AI summaries","Real-time highlights","Unlimited free recording","Action item extraction","Clip sharing","Meeting templates","Speaker detection","Keyword tracking"}', '{"Zoom","Google Meet","Microsoft Teams","Salesforce"}', 'https://fathom.video/support', true, '{"Individual professionals","Sales reps","Anyone wanting free meeting notes"}', '{"Large teams needing advanced analytics","Enterprise compliance requirements"}', 'Fathom is the best free meeting assistant available — period. Unlimited recordings with accurate AI summaries is an unbeatable value proposition. Premium adds CRM sync for sales teams.', now()),

('tl;dv', 'tldv', 'AI meeting recorder built for sales teams', 'tl;dv records and transcribes Google Meet, Zoom, and Teams meetings with AI-powered summaries. Designed for sales teams with features like CRM auto-population, objection tracking, and coaching scorecards. Supports 30+ languages and offers timestamped clips for easy sharing.', 'https://tldv.io', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited recordings","AI notes","Timestamped clips"]},{"plan":"Pro","price":"$18/user/mo","features":["CRM integration","AI reports","Custom vocabulary"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Admin controls","Dedicated support"]}]', 'beginner', true, '{web,api}', '{"AI meeting summaries","CRM auto-population","Objection tracking","Coaching scorecards","Timestamped clips","30+ language support","Speaker analytics","Meeting templates"}', '{"Salesforce","HubSpot","Slack","Google Meet"}', 'https://tldv.io/docs', true, '{"Sales teams","Revenue leaders","Multilingual teams"}', '{"Solo users happy with free Fathom","Teams not using a CRM"}', 'tl;dv is the best meeting recorder purpose-built for sales teams. The CRM auto-sync and coaching features justify the price if you are running a sales org.', now()),

('Gong', 'gong', 'Revenue intelligence platform powered by AI', 'Gong is the leading revenue intelligence platform that captures and analyzes customer interactions across calls, emails, and web conferences. AI surfaces deal risks, winning behaviors, and market insights. Used by enterprise sales organizations to improve win rates and forecast accuracy.', 'https://gong.io', 'contact', '[{"plan":"Professional","price":"Contact sales","features":["Call recording","AI insights","Deal intelligence"]},{"plan":"Enterprise","price":"Contact sales","features":["Forecasting","Market intelligence","Custom integrations"]}]', 'intermediate', true, '{web,mobile,api}', '{"Conversation intelligence","Deal risk scoring","Revenue forecasting","Market intelligence","Coaching recommendations","Email tracking","Pipeline analytics","Talk pattern analysis"}', '{"Salesforce","HubSpot","Zoom","Microsoft Teams"}', 'https://gong.io/api', true, '{"Enterprise sales organizations","Revenue leaders","Sales enablement teams"}', '{"Small businesses","Non-sales teams","Budget-constrained startups"}', 'Gong is the undisputed leader in revenue intelligence. The AI insights genuinely help close deals, but the enterprise pricing means this is for serious sales organizations only.', now()),

('Chorus.ai', 'chorus-ai', 'Conversation intelligence for sales teams', 'Chorus.ai, now part of ZoomInfo, is a conversation intelligence platform that records and analyzes sales calls. AI identifies key moments, tracks competitor mentions, and provides coaching insights. Features include deal intelligence, relationship mapping, and integration with major CRMs.', 'https://chorus.ai', 'contact', '[{"plan":"Standard","price":"Contact sales","features":["Call recording","AI analysis","Basic insights"]},{"plan":"Enterprise","price":"Contact sales","features":["Advanced analytics","Deal intelligence","Custom integrations"]}]', 'intermediate', true, '{web,api}', '{"AI call analysis","Competitor mention tracking","Deal intelligence","Coaching insights","Relationship mapping","Transcript search","CRM integration","Market intelligence"}', '{"Salesforce","HubSpot","Outreach","SalesLoft"}', 'https://docs.chorus.ai', true, '{"Sales teams using ZoomInfo","Enterprise sales organizations","Revenue operations"}', '{"Small businesses","Non-sales teams","Teams not using ZoomInfo"}', 'Chorus.ai is a strong conversation intelligence platform, especially for teams already in the ZoomInfo ecosystem. As a standalone product it competes closely with Gong but has less market momentum.', now()),

('Grain', 'grain', 'AI meeting highlights and video clips', 'Grain automatically records meetings and uses AI to generate highlights, summaries, and shareable video clips. It captures key moments with timestamps and makes it easy to share insights with your team. Integrates with Slack, Notion, and CRM tools for seamless workflow.', 'https://grain.com', 'freemium', '[{"plan":"Free","price":"$0","features":["20 meetings/mo","AI notes","Basic clips"]},{"plan":"Business","price":"$15/seat/mo","features":["Unlimited meetings","CRM sync","Team library"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Admin controls","Premium support"]}]', 'beginner', false, '{web}', '{"AI-generated highlights","Shareable video clips","Meeting summaries","Team knowledge library","Timestamped notes","Transcript search","Speaker tags","Smart playlists"}', '{"Slack","Notion","HubSpot","Salesforce"}', 'https://support.grain.com', true, '{"Product teams sharing research","Customer-facing teams","Remote teams wanting knowledge sharing"}', '{"Individual note-taking","Teams needing deep conversation analytics"}', 'Grain excels at making meeting insights shareable. The highlight clips are perfect for product teams and customer research, but it lacks the deep analytics of Gong or Chorus.', now()),

('Tome', 'tome', 'AI-powered presentation and storytelling platform', 'Tome is an AI-native presentation tool that generates entire slide decks from a text prompt. It creates visually polished presentations with AI-generated text, images, and layouts. Features include collaborative editing, embedding web content, and sharing via unique links.', 'https://tome.app', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited pages","AI generation","Basic themes"]},{"plan":"Professional","price":"$10/person/mo","features":["Custom branding","PDF export","Analytics"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Admin controls","Priority support"]}]', 'beginner', false, '{web}', '{"AI deck generation","AI image creation","Collaborative editing","Web content embedding","Custom branding","Share via link","Responsive layouts","Template library"}', '{"Figma","Giphy","Miro","YouTube"}', 'https://tome.app/resources', true, '{"Founders building pitch decks","Sales teams","Marketers creating presentations"}', '{"Teams needing PowerPoint compatibility","Print-heavy presentation needs"}', 'Tome is the most impressive AI presentation tool for quick, visually appealing decks. The AI-generated output is a strong starting point, but you will still want to refine for important presentations.', now()),

('Pitch', 'pitch', 'Collaborative presentation platform with AI features', 'Pitch is a modern presentation platform built for teams, with real-time collaboration, brand templates, and AI-powered features. AI helps generate first drafts, summarize content, and refine messaging. Features include analytics on viewer engagement and integration with popular work tools.', 'https://pitch.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited presentations","Collaboration","Basic templates"]},{"plan":"Pro","price":"$8/member/mo","features":["Custom fonts","Advanced analytics","Video recording"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Admin controls","Priority support"]}]', 'beginner', false, '{web,desktop}', '{"AI draft generation","Real-time collaboration","Brand templates","Presentation analytics","Custom fonts and branding","Video recording","Status workflows","Smart layouts"}', '{"Slack","Figma","Google Analytics","Unsplash"}', 'https://pitch.com/learn', true, '{"Teams creating presentations collaboratively","Brand-conscious organizations","Startup pitch decks"}', '{"Individual users happy with Google Slides","Offline-first workflows"}', 'Pitch is the best collaborative presentation tool available. The design quality rivals Keynote, the collaboration matches Google Slides, and the AI features add genuine value.', now()),

('Slidebean', 'slidebean', 'AI-powered pitch deck builder for startups', 'Slidebean uses AI to design pitch deck slides automatically — you focus on content, and the AI handles layout and design. Features include a library of investor-tested templates, a pitch deck consulting service, and analytics showing how investors engage with your deck.', 'https://slidebean.com', 'paid', '[{"plan":"Starter","price":"$29/mo","features":["Unlimited decks","AI design","Basic templates"]},{"plan":"Premium","price":"$49/mo","features":["Analytics","All templates","Custom branding"]},{"plan":"Founder","price":"$149/mo","features":["Financial model","Consulting","Investor outreach"]}]', 'beginner', false, '{web}', '{"AI slide design","Investor pitch templates","Deck analytics","Financial model builder","Startup templates","Consulting services","Custom branding","Presentation tracking"}', '{"Stripe","Google Analytics","YouTube","Unsplash"}', 'https://slidebean.com/blog', true, '{"Startup founders raising funding","Entrepreneurs building pitch decks","Accelerator participants"}', '{"Corporate presentations","Teams needing full design control","Non-startup use cases"}', 'Slidebean is laser-focused on startup pitch decks and it shows. The AI design is good enough for fundraising, and the analytics revealing investor engagement is uniquely valuable.', now()),

('Canva', 'canva-ai', 'Visual design platform with AI-powered features', 'Canva is the worlds most popular design platform, now enhanced with AI features including Magic Design (AI layouts), Magic Write (AI text), Magic Eraser (background removal), and text-to-image generation. The free plan is remarkably generous with thousands of templates.', 'https://canva.com', 'freemium', '[{"plan":"Free","price":"$0","features":["250k+ templates","Basic AI features","5GB storage"]},{"plan":"Pro","price":"$13/mo","features":["All AI features","Brand Kit","100GB storage"]},{"plan":"Teams","price":"$15/person/mo","features":["Team collaboration","Brand controls","Unlimited storage"]}]', 'beginner', true, '{web,desktop,mobile,api}', '{"Magic Design AI","Magic Write","Magic Eraser","Text-to-image","250k+ templates","Brand Kit","Real-time collaboration","Video editing"}', '{"Google Drive","Dropbox","HubSpot","Mailchimp"}', 'https://www.canva.dev/docs', true, '{"Non-designers needing professional visuals","Marketing teams","Small businesses"}', '{"Professional graphic designers wanting precision","Print production workflows"}', 'Canva has democratized design and the AI features make it even more accessible. Magic Design is genuinely impressive for quick layouts. Not a Figma replacement, but perfect for 90% of business design needs.', now()),

('PandaDoc', 'pandadoc', 'AI-powered document automation and e-signatures', 'PandaDoc streamlines document workflows with AI-powered content generation, templates, e-signatures, and payment collection. Features include a drag-and-drop document builder, CRM integration, content library, and analytics showing how recipients engage with documents.', 'https://pandadoc.com', 'freemium', '[{"plan":"Free eSign","price":"$0","features":["Unlimited e-signatures","Document uploads","Mobile app"]},{"plan":"Essentials","price":"$19/user/mo","features":["Templates","Analytics","24/7 support"]},{"plan":"Business","price":"$49/user/mo","features":["AI assistant","CRM integration","Approval workflows"]}]', 'beginner', true, '{web,mobile,api}', '{"AI content generation","E-signatures","Document templates","Payment collection","Content library","Document analytics","Approval workflows","CRM integration"}', '{"Salesforce","HubSpot","Pipedrive","Zapier"}', 'https://developers.pandadoc.com', true, '{"Sales teams sending proposals","HR teams managing contracts","Small businesses needing e-signatures"}', '{"Enterprise legal departments","Highly regulated industries needing advanced compliance"}', 'PandaDoc is excellent for sales teams that need proposals, contracts, and e-signatures in one place. The AI assistant speeds up document creation, and the free e-sign tier is a smart entry point.', now()),

('DocuSign', 'docusign', 'E-signature platform with AI-powered agreement management', 'DocuSign is the global leader in e-signatures, used by over a million businesses. The Intelligent Agreement Management platform uses AI to analyze contracts, extract key terms, and automate agreement workflows. Features include templates, bulk sending, and advanced authentication.', 'https://docusign.com', 'paid', '[{"plan":"Personal","price":"$10/mo","features":["5 envelopes/mo","Basic fields","Mobile app"]},{"plan":"Standard","price":"$25/user/mo","features":["Unlimited envelopes","Templates","Comments"]},{"plan":"Business Pro","price":"$40/user/mo","features":["Payment collection","Signer attachments","Bulk send"]}]', 'beginner', true, '{web,mobile,api}', '{"E-signatures","AI contract analysis","Template library","Bulk sending","Payment collection","Advanced authentication","Audit trail","Agreement workflows"}', '{"Salesforce","Microsoft 365","Google Workspace","SAP"}', 'https://developers.docusign.com', true, '{"Legal teams","Enterprise procurement","Any business needing e-signatures"}', '{"Individuals with occasional signing needs","Teams wanting free e-signatures"}', 'DocuSign is the industry standard for e-signatures with unmatched legal recognition. The AI agreement management features are new but promising. Expensive for casual use — PandaDoc or free alternatives may suffice.', now()),

('Ramp', 'ramp', 'AI-powered corporate card and spend management', 'Ramp is a corporate card and spend management platform that uses AI to find savings, automate expense reports, and control spending. Features include automatic receipt matching, real-time spend tracking, bill pay, and vendor price intelligence that identifies duplicate subscriptions.', 'https://ramp.com', 'free', '[{"plan":"Ramp","price":"$0","features":["Corporate cards","Expense management","Bill pay","AI savings"]},{"plan":"Ramp Plus","price":"$12/user/mo","features":["Custom policies","ERP integrations","Premium support"]}]', 'beginner', true, '{web,mobile,api}', '{"AI savings intelligence","Automatic receipt matching","Real-time spend tracking","Bill pay automation","Vendor price comparison","Duplicate subscription detection","Accounting integrations","Policy controls"}', '{"QuickBooks","NetSuite","Xero","Sage"}', 'https://docs.ramp.com', true, '{"Startups managing expenses","Finance teams","Growing companies wanting spend control"}', '{"Solo freelancers","International-only businesses","Companies outside the US"}', 'Ramp is genuinely saving companies money — the AI that finds duplicate subscriptions and vendor overcharges pays for itself immediately. The free tier makes it a no-brainer for US startups.', now()),

('Brex', 'brex', 'AI-first corporate spend platform', 'Brex is a corporate spend platform offering cards, expense management, travel, and bill pay with AI-powered controls. Features include real-time budget tracking, automated receipt matching, and Brex Assistant AI that answers spend policy questions and helps with expense categorization.', 'https://brex.com', 'freemium', '[{"plan":"Essentials","price":"$0","features":["Corporate cards","Basic expense management","Accounting sync"]},{"plan":"Premium","price":"$12/user/mo","features":["Brex AI assistant","Advanced controls","Travel management"]},{"plan":"Enterprise","price":"Contact sales","features":["Custom integrations","Global payments","Dedicated support"]}]', 'beginner', true, '{web,mobile,api}', '{"Brex AI assistant","Corporate cards","Automated expense management","Travel booking","Bill pay","Real-time budgets","Receipt matching","Global payments"}', '{"QuickBooks","NetSuite","Xero","Slack"}', 'https://developer.brex.com', true, '{"Tech startups","Mid-market companies","Global businesses managing spend"}', '{"Small businesses wanting simple bookkeeping","Companies outside Brex-supported regions"}', 'Brex competes directly with Ramp and the AI features are comparable. The travel management and global payments give it an edge for companies with international operations.', now()),

('Stampli', 'stampli', 'AI-powered accounts payable automation', 'Stampli is an AI-powered accounts payable platform that automates invoice processing, approvals, and payments. Its AI assistant Billy learns your AP patterns and can code invoices, detect duplicates, and route approvals automatically. Integrates with major ERPs without changing existing workflows.', 'https://stampli.com', 'contact', '[{"plan":"Standard","price":"Contact sales","features":["Invoice processing","AI coding","Basic approvals"]},{"plan":"Premium","price":"Contact sales","features":["Advanced AI","Direct pay","ERP sync"]},{"plan":"Enterprise","price":"Contact sales","features":["Custom workflows","API access","Dedicated support"]}]', 'intermediate', true, '{web,api}', '{"Billy AI assistant","Invoice processing","Automated GL coding","Duplicate detection","Approval routing","Direct payments","ERP integration","Vendor management"}', '{"NetSuite","QuickBooks","Sage","SAP"}', 'https://stampli.com/resources', true, '{"AP departments","Finance teams","Companies processing high invoice volumes"}', '{"Small businesses with few invoices","Teams not using an ERP"}', 'Stampli is the best AI-powered AP automation tool for mid-market companies. Billy AI genuinely learns your coding patterns over time, and the ERP integrations are seamless.', now());

-- ── SECURITY & PRIVACY ──────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Darktrace', 'darktrace', 'Self-learning AI cybersecurity platform', 'Darktrace uses self-learning AI to detect and respond to cyber threats across your entire digital environment. Its Enterprise Immune System models normal behavior and flags anomalies in real time. Features include autonomous response, email security, and cloud protection.', 'https://darktrace.com', 'contact', '[{"plan":"Standard","price":"Contact sales","features":["Network detection","AI analyst","Basic response"]},{"plan":"Enterprise","price":"Contact sales","features":["Autonomous response","Email security","Cloud coverage"]},{"plan":"Complete","price":"Contact sales","features":["Full stack protection","Managed detection","24/7 support"]}]', 'advanced', true, '{self-hosted,cloud,api}', '{"Self-learning AI detection","Autonomous response (Antigena)","AI Analyst","Email security","Cloud protection","Network visualization","Threat modeling","Incident investigation"}', '{"AWS","Azure","Microsoft 365","CrowdStrike"}', 'https://darktrace.com/resources', true, '{"Enterprise security teams","SOC analysts","Organizations with complex networks"}', '{"Small businesses","Teams without security expertise","Budget-constrained startups"}', 'Darktrace is genuinely innovative — the self-learning AI detects threats that signature-based tools miss. Expensive and complex to deploy, but the autonomous response capability is best-in-class.', now()),

('CrowdStrike', 'crowdstrike', 'AI-powered endpoint security and threat intelligence', 'CrowdStrike Falcon is a cloud-native endpoint protection platform that uses AI to prevent, detect, and respond to cyber threats. Its lightweight agent provides real-time protection without impacting system performance. Features include threat hunting, vulnerability management, and incident response.', 'https://crowdstrike.com', 'contact', '[{"plan":"Falcon Go","price":"$59.99/device/yr","features":["Next-gen antivirus","Device control","Basic protection"]},{"plan":"Falcon Pro","price":"$99.99/device/yr","features":["Firewall management","USB control","Threat intelligence"]},{"plan":"Falcon Enterprise","price":"$184.99/device/yr","features":["EDR","Threat hunting","IT hygiene"]}]', 'advanced', true, '{desktop,cloud,api}', '{"AI threat detection","Endpoint detection and response","Threat intelligence","Vulnerability management","Cloud workload protection","Identity protection","Incident response","Managed threat hunting"}', '{"AWS","Azure","Splunk","ServiceNow"}', 'https://developer.crowdstrike.com', true, '{"Enterprise security teams","SOC operations","Regulated industries"}', '{"Personal use","Small businesses with basic needs","Budget-constrained teams"}', 'CrowdStrike is the market leader in endpoint security for good reason — the AI detection rates are industry-leading and the cloud-native architecture is elegant. Premium pricing reflects premium capability.', now()),

('SentinelOne', 'sentinelone', 'Autonomous AI endpoint security platform', 'SentinelOne provides autonomous endpoint protection using AI that detects, prevents, and remediates threats without human intervention. Its Singularity platform covers endpoints, cloud workloads, and identity. Features include automated rollback, threat hunting, and Storyline technology for attack visualization.', 'https://sentinelone.com', 'contact', '[{"plan":"Singularity Core","price":"Contact sales","features":["EPP","EDR","Threat intel"]},{"plan":"Singularity Control","price":"Contact sales","features":["Firewall control","Device control","Network discovery"]},{"plan":"Singularity Complete","price":"Contact sales","features":["Full automation","Ranger IoT","Cloud workloads"]}]', 'advanced', true, '{desktop,cloud,api}', '{"Autonomous threat remediation","Storyline attack visualization","Automated rollback","Cloud workload protection","Identity threat detection","Ranger IoT discovery","Purple AI","Threat hunting"}', '{"AWS","Azure","Splunk","Okta"}', 'https://developer.sentinelone.com', true, '{"Enterprise security teams","DevOps teams","Organizations wanting autonomous protection"}', '{"Small businesses","Individual users","Teams without security staff"}', 'SentinelOne is CrowdStrikes closest competitor and the autonomous remediation is genuinely impressive. Purple AI adds a natural language interface to threat hunting that security analysts love.', now()),

('Snyk', 'snyk', 'AI-powered developer security platform', 'Snyk is a developer-first security platform that finds and fixes vulnerabilities in code, open-source dependencies, containers, and infrastructure as code. AI powers the fix suggestions and prioritization. Integrates directly into IDEs, Git repos, and CI/CD pipelines.', 'https://snyk.io', 'freemium', '[{"plan":"Free","price":"$0","features":["200 open source tests/mo","100 code tests/mo","Community support"]},{"plan":"Team","price":"$25/developer/mo","features":["Unlimited tests","Fix PRs","Jira integration"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Custom policies","Priority support"]}]', 'intermediate', true, '{web,plugin,api}', '{"Code vulnerability scanning","Dependency scanning","Container security","IaC security","AI fix suggestions","IDE integration","CI/CD integration","License compliance"}', '{"GitHub","GitLab","Bitbucket","Jira"}', 'https://docs.snyk.io', true, '{"Development teams","DevSecOps teams","Open source maintainers"}', '{"Non-technical security teams","Teams without development workflows"}', 'Snyk has become the standard for developer-first security. The IDE integration means developers catch vulnerabilities before they merge, and the AI fix suggestions save significant time.', now()),

('GitGuardian', 'gitguardian', 'Secrets detection and code security platform', 'GitGuardian scans Git repositories for accidentally committed secrets like API keys, passwords, and certificates. It monitors public and private repos in real time, alerts teams instantly, and helps remediate exposed credentials. Covers 350+ types of secrets out of the box.', 'https://gitguardian.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Personal repos","25 secret incidents/mo","Email alerts"]},{"plan":"Team","price":"$34/developer/mo","features":["Org repos","Unlimited scanning","Slack alerts"]},{"plan":"Enterprise","price":"Contact sales","features":["Perimeter scanning","Custom detectors","SSO"]}]', 'intermediate', true, '{web,plugin,api}', '{"350+ secret detectors","Real-time monitoring","Public leak detection","Git hook pre-commit","Incident management","Remediation workflow","CI/CD integration","Historical scanning"}', '{"GitHub","GitLab","Bitbucket","Slack"}', 'https://docs.gitguardian.com', true, '{"Development teams","Security teams","DevOps engineers"}', '{"Non-Git workflows","Individual hobbyist projects"}', 'GitGuardian is essential for any team pushing code to Git. The number of secrets that accidentally get committed is staggering, and GitGuardian catches them before they become breaches.', now()),

('Socket.dev', 'socket-dev', 'Open source supply chain security', 'Socket.dev proactively detects supply chain attacks in open-source dependencies before they strike. Unlike traditional scanners that look for known CVEs, Socket analyzes package behavior — network access, filesystem usage, install scripts — to detect malicious packages.', 'https://socket.dev', 'freemium', '[{"plan":"Free","price":"$0","features":["Public repos","Basic alerts","npm and PyPI"]},{"plan":"Team","price":"$10/developer/mo","features":["Private repos","All ecosystems","Slack alerts"]},{"plan":"Enterprise","price":"Contact sales","features":["SSO","Custom policies","Priority support"]}]', 'advanced', true, '{web,plugin,api}', '{"Supply chain attack detection","Package behavior analysis","Typosquat detection","Install script analysis","Network access monitoring","CI/CD integration","GitHub PR comments","Multi-ecosystem support"}', '{"GitHub","npm","PyPI","Go modules"}', 'https://docs.socket.dev', true, '{"Security-conscious development teams","Open source maintainers","DevSecOps teams"}', '{"Non-developers","Teams not using open source","Small personal projects"}', 'Socket.dev takes a fundamentally different approach to dependency security by analyzing behavior rather than just known CVEs. This catches zero-day supply chain attacks that other tools miss entirely.', now()),

('Orca Security', 'orca-security', 'Agentless cloud security with AI', 'Orca Security provides agentless cloud security by scanning cloud environments without deploying agents. It covers vulnerabilities, misconfigurations, malware, lateral movement risks, and sensitive data exposure. AI-powered risk prioritization helps teams focus on what matters most.', 'https://orca.security', 'contact', '[{"plan":"Standard","price":"Contact sales","features":["Cloud vulnerability scanning","Misconfiguration detection","Compliance"]},{"plan":"Premium","price":"Contact sales","features":["AI risk scoring","Attack path analysis","Data security"]},{"plan":"Enterprise","price":"Contact sales","features":["Multi-cloud","Custom policies","Premium support"]}]', 'advanced', true, '{cloud,api}', '{"Agentless scanning","AI risk prioritization","Attack path analysis","Compliance monitoring","Data security posture","Container security","Identity analysis","Multi-cloud support"}', '{"AWS","Azure","GCP","Jira"}', 'https://docs.orcasecurity.io', true, '{"Cloud security teams","DevOps teams managing cloud infrastructure","Compliance-focused organizations"}', '{"On-premise-only environments","Small businesses without cloud infrastructure"}', 'Orca Security agentless approach is a genuine differentiator — no agents means no performance impact and full coverage. The AI risk prioritization helps overwhelmed security teams focus on real threats.', now()),

('Abnormal Security', 'abnormal-security', 'AI-powered email security against advanced attacks', 'Abnormal Security uses behavioral AI to detect and block sophisticated email attacks including business email compromise, phishing, and account takeovers. It builds a profile of normal communication patterns and flags anomalies that traditional email security misses.', 'https://abnormalsecurity.ai', 'contact', '[{"plan":"Inbound Email Security","price":"Contact sales","features":["BEC protection","Phishing detection","Account takeover"]},{"plan":"Email Platform Security","price":"Contact sales","features":["Posture management","Mailbox intelligence","Full platform"]},{"plan":"Enterprise","price":"Contact sales","features":["Multi-brand","Advanced API","Premium support"]}]', 'advanced', true, '{cloud,api}', '{"Behavioral AI detection","BEC protection","Account takeover prevention","Phishing detection","VIP impersonation blocking","Supply chain attack detection","Automated remediation","Threat intelligence"}', '{"Microsoft 365","Google Workspace","CrowdStrike","Splunk"}', 'https://abnormalsecurity.ai/resources', true, '{"Enterprise email security teams","Organizations targeted by BEC attacks","Microsoft 365 and Google Workspace users"}', '{"Small businesses with basic email needs","On-premise email servers"}', 'Abnormal Security is the most effective AI-based email security platform for stopping business email compromise. The behavioral approach catches attacks that gateway-based tools miss entirely.', now()),

('Tessian', 'tessian', 'AI email security for human layer protection', 'Tessian, now part of Proofpoint, uses machine learning to prevent email threats caused by human error — accidental data loss, misdirected emails, and phishing. It analyzes email patterns to detect anomalies and coaches employees in real time to prevent mistakes.', 'https://tessian.com', 'contact', '[{"plan":"Defender","price":"Contact sales","features":["Phishing protection","Impersonation detection","Real-time warnings"]},{"plan":"Guardian","price":"Contact sales","features":["Misdirected email prevention","Data loss prevention","Coaching"]},{"plan":"Complete","price":"Contact sales","features":["Full platform","Custom policies","Advanced analytics"]}]', 'intermediate', true, '{cloud,api}', '{"Misdirected email prevention","Phishing protection","Data loss prevention","Real-time employee coaching","Behavioral analysis","Impersonation detection","Automated policies","Risk dashboard"}', '{"Microsoft 365","Google Workspace","Proofpoint","Splunk"}', 'https://tessian.com/resources', true, '{"Enterprise organizations","Compliance-focused industries","Companies with high email volume"}', '{"Small businesses","Teams not using cloud email","Budget-constrained organizations"}', 'Tessian unique focus on human-caused email errors fills a real gap — misdirected emails and accidental data exposure are problems no other tool solves as well. Now part of Proofpoint for even broader protection.', now()),

('Nightfall AI', 'nightfall-ai', 'AI-powered data loss prevention for cloud apps', 'Nightfall AI uses machine learning to discover, classify, and protect sensitive data across cloud apps like Slack, GitHub, Google Drive, and Jira. It detects PII, credentials, financial data, and PHI in real time and can automatically redact or alert on policy violations.', 'https://nightfall.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["100 scans/mo","Basic detection","Slack integration"]},{"plan":"Developer","price":"$0.01/API call","features":["API access","Custom detectors","All data types"]},{"plan":"Enterprise","price":"Contact sales","features":["All integrations","Custom policies","Admin controls"]}]', 'intermediate', true, '{cloud,api}', '{"ML-based data classification","Real-time PII detection","Credential exposure alerts","Auto-redaction","Cloud app scanning","Custom detection rules","API access","Compliance reporting"}', '{"Slack","GitHub","Google Drive","Jira"}', 'https://docs.nightfall.ai', true, '{"Security teams managing cloud data","Compliance officers","DevOps teams concerned about secret leakage"}', '{"On-premise-only environments","Teams not using cloud SaaS apps"}', 'Nightfall AI is the best cloud-native DLP solution for modern SaaS-heavy workplaces. The ML-based detection is far more accurate than regex-based alternatives, and the Slack integration alone is worth it.', now());


-- ============================================================
-- CATEGORY LINKS
-- ============================================================

-- Customer Support
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'intercom' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'zendesk' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'freshdesk' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tidio' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'drift' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ada-cx' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatbase' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'botpress' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'voiceflow' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'crisp' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'livechat' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'customerly' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kommunicate' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'helpscout' AND c.slug = 'customer-support';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kayako' AND c.slug = 'customer-support';

-- Automation & Agents
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'agentgpt' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'autogpt' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'crewai' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'bardeen' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tray-io' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'workato' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'power-automate' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'activepieces' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pipedream' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'clay' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'phantombuster' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'browse-ai' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'axiom-ai' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'relevance-ai' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'superagent' AND c.slug = 'automation-agents';

-- Business & Finance
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fireflies-ai' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fathom' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tldv' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gong' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chorus-ai' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'grain' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tome' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pitch' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'slidebean' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'canva-ai' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pandadoc' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'docusign' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ramp' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'brex' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'stampli' AND c.slug = 'business-finance';

-- Security & Privacy
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'darktrace' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'crowdstrike' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sentinelone' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'snyk' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gitguardian' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'socket-dev' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'orca-security' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'abnormal-security' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tessian' AND c.slug = 'security-privacy';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'nightfall-ai' AND c.slug = 'security-privacy';

-- Cross-category links (tools that fit multiple categories)
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'botpress' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'voiceflow' AND c.slug = 'automation-agents';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'clay' AND c.slug = 'marketing-seo';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'phantombuster' AND c.slug = 'marketing-seo';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'canva-ai' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tome' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pitch' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fireflies-ai' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fathom' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tldv' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'snyk' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gitguardian' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'socket-dev' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'drift' AND c.slug = 'marketing-seo';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'power-automate' AND c.slug = 'productivity';


-- ============================================================
-- TAG LINKS
-- ============================================================

-- Customer Support tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'intercom' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'intercom' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'zendesk' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'zendesk' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'freshdesk' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'freshdesk' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tidio' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tidio' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'drift' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'drift' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ada-cx' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ada-cx' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ada-cx' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatbase' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatbase' AND tg.slug = 'rag';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatbase' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'botpress' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'botpress' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'botpress' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'voiceflow' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'voiceflow' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'voiceflow' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crisp' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crisp' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'livechat' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'livechat' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'customerly' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'customerly' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'kommunicate' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'kommunicate' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'helpscout' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'helpscout' AND tg.slug = 'text-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'kayako' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'kayako' AND tg.slug = 'workflow';

-- Automation & Agents tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'agentgpt' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'agentgpt' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'agentgpt' AND tg.slug = 'text-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'autogpt' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'autogpt' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'autogpt' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crewai' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crewai' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crewai' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'bardeen' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'bardeen' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'bardeen' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tray-io' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tray-io' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tray-io' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'workato' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'workato' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'workato' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'power-automate' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'power-automate' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'power-automate' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'activepieces' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'activepieces' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'activepieces' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pipedream' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pipedream' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pipedream' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clay' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clay' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clay' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'phantombuster' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'phantombuster' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'browse-ai' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'browse-ai' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'browse-ai' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'axiom-ai' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'axiom-ai' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'relevance-ai' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'relevance-ai' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'relevance-ai' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'superagent' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'superagent' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'superagent' AND tg.slug = 'rag';

-- Business & Finance tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fireflies-ai' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fireflies-ai' AND tg.slug = 'transcription';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fireflies-ai' AND tg.slug = 'summarization';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fathom' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fathom' AND tg.slug = 'transcription';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fathom' AND tg.slug = 'summarization';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tldv' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tldv' AND tg.slug = 'transcription';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tldv' AND tg.slug = 'summarization';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gong' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gong' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gong' AND tg.slug = 'transcription';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chorus-ai' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chorus-ai' AND tg.slug = 'transcription';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chorus-ai' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'grain' AND tg.slug = 'meeting-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'grain' AND tg.slug = 'summarization';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tome' AND tg.slug = 'presentation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tome' AND tg.slug = 'text-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tome' AND tg.slug = 'image-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pitch' AND tg.slug = 'presentation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pitch' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'slidebean' AND tg.slug = 'presentation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'slidebean' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'canva-ai' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'canva-ai' AND tg.slug = 'image-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'canva-ai' AND tg.slug = 'presentation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pandadoc' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pandadoc' AND tg.slug = 'text-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'docusign' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'docusign' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ramp' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ramp' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'brex' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'brex' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'stampli' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'stampli' AND tg.slug = 'workflow';

-- Security & Privacy tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'darktrace' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'darktrace' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crowdstrike' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'crowdstrike' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sentinelone' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sentinelone' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'snyk' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'snyk' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gitguardian' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gitguardian' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'socket-dev' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'socket-dev' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'orca-security' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'orca-security' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'abnormal-security' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'abnormal-security' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tessian' AND tg.slug = 'email';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tessian' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'nightfall-ai' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'nightfall-ai' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'nightfall-ai' AND tg.slug = 'data-analysis';

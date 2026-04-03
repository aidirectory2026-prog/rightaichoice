-- Migration: 014_seed_tools_batch5.sql
-- Description: Seed 55 AI tools for Code & Development, Design & UI, and Data & Analytics categories
-- Created: 2026-04-01

BEGIN;

-- =============================================
-- CODE & DEVELOPMENT TOOLS (20)
-- =============================================

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Tabnine', 'tabnine', 'AI code completion for every IDE', 'Tabnine is an AI-powered code completion tool that uses deep learning to predict and suggest code completions in real time. It supports over 30 programming languages and integrates with all major IDEs, offering both cloud and local model options for privacy-conscious teams.', 'https://tabnine.com', 'freemium', '[{"plan":"Starter","price":"$0","features":["Basic code completions","Limited suggestions"]},{"plan":"Pro","price":"$12/mo","features":["Full-line completions","Natural language to code","Custom models"]},{"plan":"Enterprise","price":"Custom","features":["Private model training","SSO","Self-hosted option"]}]', 'intermediate', true, '{web,desktop,api}', '{"AI code completion","Multi-language support","Whole-line predictions","Local model option","Team learning","Context-aware suggestions"}', '{"VS Code","JetBrains","Neovim"}', 'https://docs.tabnine.com', true, '{"Software developers","Development teams","Enterprise engineering orgs"}', '{"Non-technical users","Beginners learning to code"}', 'Tabnine is a solid code completion tool that shines for enterprise teams needing privacy controls and on-premise deployment. It is slightly less capable than Copilot for raw suggestion quality but wins on customization.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Codeium', 'codeium', 'Free AI code assistant for developers', 'Codeium provides free AI-powered code completion and search across 70+ programming languages. It offers fast autocomplete, intelligent search, and in-editor chat capabilities, making it a compelling free alternative to paid code assistants like GitHub Copilot.', 'https://codeium.com', 'freemium', '[{"plan":"Individual","price":"$0","features":["Unlimited autocomplete","In-editor chat","70+ languages"]},{"plan":"Teams","price":"$12/user/mo","features":["Admin controls","Usage analytics","Priority support"]},{"plan":"Enterprise","price":"Custom","features":["Self-hosted","Custom models","SSO"]}]', 'beginner', true, '{web,desktop,api}', '{"AI autocomplete","In-editor chat","Code search","Multi-language support","Context awareness","Fast inference"}', '{"VS Code","JetBrains","Neovim"}', 'https://codeium.com/docs', true, '{"Individual developers","Budget-conscious teams","Open source contributors"}', '{"Enterprise teams needing advanced governance","Users wanting code explanation features"}', 'Codeium is the best free AI code assistant available, offering genuinely unlimited completions without charge. Quality trails Copilot slightly but the price-to-value ratio is unbeatable.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Amazon CodeWhisperer', 'amazon-codewhisperer', 'AI coding companion from AWS', 'Amazon CodeWhisperer is an AI-powered code generation tool from AWS that provides real-time code suggestions based on comments and existing code. It has built-in security scanning to identify vulnerabilities and tracks suggestions that may resemble open source training data for license attribution.', 'https://aws.amazon.com/codewhisperer', 'freemium', '[{"plan":"Individual","price":"$0","features":["Unlimited code suggestions","Reference tracking","Security scans"]},{"plan":"Professional","price":"$19/user/mo","features":["Admin controls","Organizational policies","SSO","Higher security scan limits"]}]', 'intermediate', true, '{desktop,api}', '{"Code generation","Security scanning","Reference tracking","Multi-language support","AWS service integration","License attribution"}', '{"VS Code","JetBrains","AWS Cloud9"}', 'https://docs.aws.amazon.com/codewhisperer', true, '{"AWS developers","Cloud engineers","Security-conscious teams"}', '{"Developers not using AWS","Beginners unfamiliar with cloud services"}', 'CodeWhisperer is a natural choice for AWS-heavy shops, with excellent integration into the AWS ecosystem. Its security scanning feature is a genuine differentiator, though suggestion quality outside AWS services is average.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Sourcegraph Cody', 'sourcegraph-cody', 'AI code assistant with full codebase context', 'Sourcegraph Cody is an AI coding assistant that understands your entire codebase by leveraging Sourcegraph''s code graph. It can answer questions about code, generate code, and explain complex functions with deep contextual awareness that goes beyond single-file understanding.', 'https://sourcegraph.com/cody', 'freemium', '[{"plan":"Free","price":"$0","features":["Autocomplete","Chat","Limited commands"]},{"plan":"Pro","price":"$9/mo","features":["Unlimited usage","Multiple LLM choices","Advanced commands"]},{"plan":"Enterprise","price":"Custom","features":["Full codebase context","Custom models","RBAC"]}]', 'intermediate', true, '{web,desktop,api}', '{"Codebase-aware chat","AI autocomplete","Code explanations","Multi-repo context","Multiple LLM backends","Code navigation"}', '{"VS Code","JetBrains","Sourcegraph"}', 'https://sourcegraph.com/docs/cody', true, '{"Large engineering teams","Developers working with monorepos","Enterprise codebases"}', '{"Solo developers on small projects","Non-technical users"}', 'Cody''s codebase-wide context is its killer feature, making it uniquely powerful for navigating and understanding large codebases. It is the best option when you need an AI that truly knows your entire repository.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Pieces for Developers', 'pieces-for-developers', 'AI-powered snippet manager and copilot', 'Pieces for Developers is a smart code snippet manager with an integrated AI copilot. It saves, enriches, and helps you reuse code snippets across your workflow, automatically adding context like tags, descriptions, and related links to saved materials.', 'https://pieces.app', 'freemium', '[{"plan":"Free","price":"$0","features":["Snippet management","Basic AI features","Local processing"]},{"plan":"Pro","price":"$10/mo","features":["Cloud sync","Advanced AI copilot","Priority support","Team sharing"]}]', 'beginner', true, '{desktop,web}', '{"Smart snippet saving","AI copilot chat","Auto-enrichment","Context awareness","Cross-IDE support","Offline-first architecture"}', '{"VS Code","JetBrains","Chrome","Obsidian"}', 'https://docs.pieces.app', true, '{"Developers managing code snippets","Teams sharing knowledge","Learners collecting reference code"}', '{"Users wanting full code generation","Teams needing CI/CD integration"}', 'Pieces fills a unique niche as an AI-powered knowledge manager for code. It is excellent for developers who frequently reuse snippets and want them organized automatically.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Windsurf', 'windsurf', 'The first agentic AI IDE', 'Windsurf by Codeium is an AI-native IDE that combines copilot and agentic capabilities in a single editor. It can autonomously perform multi-step coding tasks, search your codebase, run commands, and iterate on code with deep contextual understanding of your entire project.', 'https://codeium.com/windsurf', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic completions","Limited agentic actions"]},{"plan":"Pro","price":"$15/mo","features":["Unlimited flows","Premium models","Advanced agentic features"]},{"plan":"Enterprise","price":"Custom","features":["Self-hosted","Custom models","Admin controls"]}]', 'intermediate', true, '{desktop}', '{"Agentic coding flows","Multi-file editing","Command execution","Codebase search","Contextual awareness","Cascade AI system"}', '{"GitHub","GitLab","Terminal"}', 'https://docs.codeium.com/windsurf', true, '{"Developers wanting an AI-native IDE","Full-stack engineers","Rapid prototypers"}', '{"Developers committed to VS Code or JetBrains ecosystem","Users wanting minimal AI intervention"}', 'Windsurf represents the next evolution of AI-assisted coding with its agentic approach. Its Cascade system is impressively capable at multi-step tasks, though the IDE itself is still maturing compared to VS Code.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Devin', 'devin', 'The first AI software engineer', 'Devin by Cognition is an autonomous AI software engineer that can plan, write code, debug, and deploy complete features independently. It operates in its own sandboxed environment with access to a shell, browser, and code editor, handling complex engineering tasks from start to finish.', 'https://cognition.ai', 'paid', '[{"plan":"Team","price":"$500/mo","features":["Autonomous coding","Sandboxed environment","Slack integration","GitHub PR creation"]}]', 'advanced', true, '{web}', '{"Autonomous task completion","Sandboxed dev environment","Multi-step planning","Bug fixing","Codebase learning","PR generation"}', '{"GitHub","Slack","Linear"}', 'https://docs.cognition.ai', true, '{"Engineering teams with backlogs","Startups needing to ship faster","Teams handling routine coding tasks"}', '{"Budget-conscious individuals","Teams needing real-time pair programming","Projects requiring nuanced architectural decisions"}', 'Devin is a genuinely impressive leap in autonomous coding, capable of handling real engineering tasks end-to-end. However, it works best on well-defined tasks and still needs human review for complex architectural decisions.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Cline', 'cline', 'Autonomous AI coding agent for VS Code', 'Cline is an open-source AI coding agent that operates directly in VS Code, capable of creating and editing files, running terminal commands, and browsing the web. It supports multiple LLM providers and gives users explicit approval control over every action the agent takes.', 'https://github.com/cline/cline', 'free', '[{"plan":"Free","price":"$0","features":["Full agent capabilities","Multi-provider support","Open source","Human-in-the-loop approval"]}]', 'advanced', false, '{desktop}', '{"Autonomous file editing","Terminal command execution","Web browsing","Multi-LLM support","Human approval loop","Context management"}', '{"VS Code","OpenAI","Anthropic","Google AI"}', 'https://github.com/cline/cline/wiki', true, '{"Developers wanting agent control","Open source advocates","Power users comfortable with LLM APIs"}', '{"Beginners unfamiliar with LLMs","Users wanting a hosted solution","Teams needing centralized management"}', 'Cline is one of the best open-source coding agents available, giving users full transparency and control. You need to bring your own API key, but the flexibility and approval-based workflow make it a top pick for power users.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Continue', 'continue-dev', 'Open source AI code assistant', 'Continue is an open-source AI code assistant that brings the power of LLMs into VS Code and JetBrains. It supports any LLM provider including local models, offering autocomplete, chat, and inline editing with full customization over prompts, context, and model selection.', 'https://continue.dev', 'free', '[{"plan":"Free","price":"$0","features":["Open source","Any LLM provider","Autocomplete","Chat","Customizable prompts"]}]', 'advanced', false, '{desktop}', '{"Customizable AI chat","Tab autocomplete","Inline editing","Any LLM backend","Local model support","Custom slash commands"}', '{"VS Code","JetBrains","Ollama","OpenAI"}', 'https://continue.dev/docs', true, '{"Developers wanting LLM flexibility","Privacy-focused teams using local models","Open source enthusiasts"}', '{"Users wanting plug-and-play simplicity","Non-technical users","Teams needing managed solutions"}', 'Continue is the Swiss Army knife of AI code assistants, supporting virtually any LLM backend with deep customization. Setup requires more effort than commercial alternatives, but the flexibility is unmatched.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Codex by OpenAI', 'openai-codex', 'Cloud-based AI coding agent by OpenAI', 'OpenAI Codex is a cloud-based software engineering agent that can handle multiple coding tasks in parallel. It runs in a sandboxed environment, reads your codebase, writes and tests code, then proposes changes as pull requests, operating asynchronously to maximize developer throughput.', 'https://openai.com/index/introducing-codex', 'paid', '[{"plan":"Pro","price":"Included with ChatGPT Pro ($200/mo)","features":["Cloud sandboxed environment","Parallel task execution","PR generation","Autonomous testing"]}]', 'advanced', true, '{web,api}', '{"Parallel task execution","Sandboxed environments","PR generation","Automated testing","Codebase understanding","Async operation"}', '{"GitHub","ChatGPT","OpenAI API"}', 'https://platform.openai.com/docs', true, '{"Engineering teams with large backlogs","Developers wanting async AI coding","OpenAI ecosystem users"}', '{"Budget-conscious users","Developers needing real-time assistance","Small personal projects"}', 'OpenAI Codex brings serious firepower for autonomous coding tasks, especially with its parallel execution capability. The high price point via ChatGPT Pro means it is best suited for teams where developer time savings justify the cost.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Phind', 'phind', 'AI search engine for developers', 'Phind is an AI-powered search engine designed specifically for developers. It provides instant, code-focused answers with sources, combining web search with AI synthesis to deliver relevant technical answers faster than traditional search engines.', 'https://phind.com', 'freemium', '[{"plan":"Free","price":"$0","features":["AI search","Basic model","Limited daily searches"]},{"plan":"Pro","price":"$20/mo","features":["GPT-4 level model","Unlimited searches","Longer context","Profile customization"]}]', 'beginner', true, '{web,api}', '{"Developer-focused search","Code generation","Source citations","Pair programming mode","VS Code extension","Context carry-over"}', '{"VS Code","Chrome","Web browsers"}', 'https://phind.com/docs', true, '{"Developers debugging issues","Engineers researching solutions","Students learning to code"}', '{"Non-technical users","Users needing general knowledge search"}', 'Phind is genuinely faster than Google for technical queries, delivering synthesized code answers with proper citations. It has become a daily driver for many developers who need quick, accurate technical answers.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Blackbox AI', 'blackbox-ai', 'AI-powered code generation and chat', 'Blackbox AI is a code generation platform offering real-time code completion, AI chat, and code search. It can generate code from natural language prompts, extract code from images and videos, and integrates into multiple IDEs for a seamless development experience.', 'https://blackbox.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Code completion","AI chat","Code search"]},{"plan":"Pro","price":"$16/mo","features":["Unlimited usage","Premium models","Priority support","Advanced features"]}]', 'beginner', true, '{web,desktop}', '{"Code generation","Code from images","AI chat","Code search","Multi-IDE support","Real-time completion"}', '{"VS Code","Chrome","Web browsers"}', 'https://blackbox.ai/docs', true, '{"Developers wanting quick code generation","Students learning programming","Rapid prototypers"}', '{"Enterprise teams needing governance","Users requiring high-accuracy suggestions"}', 'Blackbox AI offers an accessible entry point for AI-assisted coding with its free tier and image-to-code feature. Code quality can be inconsistent compared to top-tier alternatives, but it is a useful supplementary tool.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('CodeRabbit', 'coderabbit', 'AI-powered code review assistant', 'CodeRabbit is an AI code review tool that automatically reviews pull requests on GitHub and GitLab. It provides line-by-line feedback, identifies bugs and security issues, suggests improvements, and generates PR summaries, acting as a tireless first-pass code reviewer for every commit.', 'https://coderabbit.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Public repos","Basic reviews","PR summaries"]},{"plan":"Pro","price":"$15/user/mo","features":["Private repos","Advanced analysis","Custom rules","Priority processing"]}]', 'intermediate', true, '{web,api}', '{"Automated PR review","Bug detection","Security analysis","PR summaries","Custom review rules","Incremental reviews"}', '{"GitHub","GitLab","Slack"}', 'https://docs.coderabbit.ai', true, '{"Development teams wanting faster reviews","Open source maintainers","Teams with review bottlenecks"}', '{"Solo developers on tiny projects","Teams wanting human-only review processes"}', 'CodeRabbit is one of the best AI code review tools available, consistently catching real issues that human reviewers might miss on first pass. It dramatically reduces review turnaround time without replacing human oversight.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Sweep', 'sweep', 'AI junior developer for GitHub issues', 'Sweep is an AI-powered tool that turns GitHub issues into pull requests automatically. It reads your codebase, plans the implementation, writes the code, and creates a PR with the changes, handling bug fixes, small features, and refactors autonomously.', 'https://sweep.dev', 'freemium', '[{"plan":"Free","price":"$0","features":["Public repos","Basic issue handling"]},{"plan":"Pro","price":"$480/year","features":["Private repos","Unlimited PRs","Priority processing","GPT-4 powered"]}]', 'intermediate', true, '{web}', '{"Issue to PR automation","Codebase understanding","Automated testing","Self-correction","Multi-file changes","Stack trace debugging"}', '{"GitHub","VS Code","Slack"}', 'https://docs.sweep.dev', true, '{"Small development teams","Open source maintainers","Teams with large issue backlogs"}', '{"Teams needing complex architectural changes","Projects with minimal test coverage"}', 'Sweep is a clever automation that handles routine GitHub issues surprisingly well. It works best for well-defined, scoped tasks and can meaningfully reduce the backlog of small improvements and bug fixes.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Mintlify', 'mintlify', 'AI-powered documentation platform', 'Mintlify is a modern documentation platform that uses AI to help create and maintain beautiful, up-to-date documentation. It auto-generates documentation from code, provides an AI-powered search widget for docs, and offers a polished reading experience out of the box.', 'https://mintlify.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic docs site","AI search widget","GitHub sync"]},{"plan":"Startup","price":"$120/mo","features":["Custom domain","Analytics","Advanced components"]},{"plan":"Growth","price":"$400/mo","features":["Multiple projects","SSO","Priority support"]}]', 'beginner', true, '{web}', '{"AI doc generation","AI search widget","GitHub sync","Markdown support","Custom components","Analytics dashboard"}', '{"GitHub","GitLab","VS Code"}', 'https://mintlify.com/docs', true, '{"Developer-facing companies needing docs","API providers","Open source projects"}', '{"Non-technical documentation needs","Internal wikis"}', 'Mintlify has become the gold standard for developer documentation, combining gorgeous defaults with AI-powered features. The AI search widget alone makes it worth considering for any API or developer tool company.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('GitLab Duo', 'gitlab-duo', 'AI-powered DevSecOps platform', 'GitLab Duo integrates AI across the entire GitLab DevSecOps platform, offering code suggestions, AI-assisted code review, vulnerability explanations, root cause analysis, and value stream forecasting. It brings AI capabilities to every stage of the software development lifecycle within GitLab.', 'https://about.gitlab.com/gitlab-duo', 'paid', '[{"plan":"Premium with Duo Pro","price":"$19/user/mo add-on","features":["Code suggestions","Chat","CI/CD troubleshooting"]},{"plan":"Ultimate with Duo Enterprise","price":"$39/user/mo add-on","features":["Vulnerability resolution","Root cause analysis","Value stream forecasting","Custom models"]}]', 'intermediate', true, '{web,desktop,api}', '{"Code suggestions","AI code review","Vulnerability resolution","Root cause analysis","CI/CD troubleshooting","Value stream forecasting"}', '{"GitLab","VS Code","JetBrains"}', 'https://docs.gitlab.com/ee/user/gitlab_duo', true, '{"GitLab-native teams","Enterprise DevSecOps teams","Security-focused organizations"}', '{"GitHub users","Small teams not on GitLab","Budget-conscious individual developers"}', 'GitLab Duo is a comprehensive AI layer for teams already invested in GitLab, covering everything from coding to security to deployment. It is the most complete DevSecOps AI offering available, though it requires GitLab commitment.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('JetBrains AI', 'jetbrains-ai', 'AI assistant built into JetBrains IDEs', 'JetBrains AI Assistant integrates AI capabilities directly into IntelliJ IDEA, PyCharm, WebStorm, and other JetBrains IDEs. It offers context-aware code completion, AI chat, commit message generation, code explanation, and refactoring suggestions that leverage JetBrains'' deep understanding of code structure.', 'https://www.jetbrains.com/ai', 'paid', '[{"plan":"AI Assistant","price":"$10/mo","features":["AI completion","Chat","Commit messages","Code explanation","Multi-LLM support"]}]', 'intermediate', false, '{desktop}', '{"Context-aware completion","AI chat","Commit message generation","Code explanation","Refactoring suggestions","Documentation generation"}', '{"IntelliJ IDEA","PyCharm","WebStorm","PhpStorm"}', 'https://www.jetbrains.com/help/idea/ai-assistant.html', true, '{"JetBrains IDE users","Java and Kotlin developers","Enterprise development teams"}', '{"VS Code users","Developers wanting free AI tools","Vim/Neovim users"}', 'JetBrains AI is a natural add-on for existing JetBrains users, integrating seamlessly into already powerful IDEs. The code-structure awareness gives it an edge in refactoring and navigation tasks compared to generic AI assistants.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Warp', 'warp', 'AI-powered modern terminal', 'Warp is a reimagined terminal application with AI built in. It features natural language command generation, intelligent command suggestions, workflow sharing, and a modern IDE-like editing experience that makes the command line more accessible and productive for all developers.', 'https://warp.dev', 'freemium', '[{"plan":"Free","price":"$0","features":["AI command generation","Modern editor","Basic features"]},{"plan":"Team","price":"$22/user/mo","features":["Shared workflows","Team analytics","Priority support"]}]', 'beginner', false, '{desktop}', '{"AI command generation","Modern text editing","Workflow sharing","Command grouping","Completions","Session sharing"}', '{"macOS","Linux","GitHub"}', 'https://docs.warp.dev', true, '{"Developers wanting a modern terminal","DevOps engineers","CLI beginners"}', '{"Users on Windows","Developers happy with traditional terminals","Keyboard-only workflow purists"}', 'Warp makes the terminal genuinely more approachable with its AI features and modern interface. The natural language to command feature alone saves significant time for developers who do not memorize every CLI flag.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Fig', 'fig', 'AI-powered terminal autocomplete', 'Fig (now Amazon CodeWhisperer for command line) adds visual autocomplete to any terminal application. It provides IDE-style completions for CLI tools, scripts, and commands, with AI-powered natural language to bash translation that makes the command line dramatically more efficient.', 'https://fig.io', 'free', '[{"plan":"Free","price":"$0","features":["Autocomplete","500+ CLI integrations","Natural language to bash","Custom completions"]}]', 'beginner', false, '{desktop}', '{"Terminal autocomplete","Natural language to bash","500+ CLI completions","Custom completion specs","Script generation","Dotfile management"}', '{"macOS Terminal","iTerm2","VS Code Terminal","Hyper"}', 'https://fig.io/docs', true, '{"CLI-heavy developers","DevOps engineers","Terminal power users"}', '{"Windows users","Users who prefer GUIs over CLI","Minimal terminal users"}', 'Fig transformed terminal usability before being acquired by AWS. Its autocomplete for CLI tools feels magical and dramatically reduces time spent looking up command flags and options.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Raycast', 'raycast', 'Productivity launcher with built-in AI', 'Raycast is a blazingly fast macOS launcher that replaces Spotlight with extensible productivity tools and built-in AI. It offers AI-powered chat, text generation, code generation, and hundreds of extensions that integrate with developer tools, all accessible via a quick keyboard shortcut.', 'https://raycast.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Launcher","Extensions","Clipboard history","Snippets"]},{"plan":"Pro","price":"$8/mo","features":["Raycast AI","Unlimited AI commands","Custom AI presets","Cloud sync"]},{"plan":"Team","price":"$12/user/mo","features":["Shared extensions","Team snippets","Admin controls"]}]', 'beginner', true, '{desktop}', '{"AI chat and commands","Extensible launcher","Clipboard history","Snippet management","Window management","Developer tool integrations"}', '{"GitHub","Jira","Linear","Slack"}', 'https://manual.raycast.com', true, '{"Mac power users","Developers wanting quick access to AI","Productivity enthusiasts"}', '{"Windows or Linux users","Users satisfied with Spotlight","Non-technical users"}', 'Raycast is the ultimate macOS productivity tool with surprisingly capable AI features built right in. Having instant AI access via a keyboard shortcut changes how you work, making it worth the Pro subscription for heavy users.', now());

-- =============================================
-- DESIGN & UI TOOLS (20)
-- =============================================

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Figma AI', 'figma-ai', 'Design platform with built-in AI features', 'Figma AI brings intelligent features directly into the world''s most popular collaborative design tool. It offers AI-powered rename layers, visual search, asset generation, and first-draft design creation, helping designers automate tedious tasks and focus on creative decisions.', 'https://figma.com', 'freemium', '[{"plan":"Free","price":"$0","features":["3 projects","Basic AI features","Collaboration"]},{"plan":"Professional","price":"$15/editor/mo","features":["Unlimited projects","Full AI features","Dev mode"]},{"plan":"Enterprise","price":"$75/editor/mo","features":["Advanced admin","SSO","Custom plugins"]}]', 'intermediate', true, '{web,desktop}', '{"AI-powered design","Auto layout","Prototyping","Dev mode","Real-time collaboration","Plugin ecosystem"}', '{"Slack","Jira","GitHub","Storybook"}', 'https://help.figma.com', true, '{"Product designers","Design teams","Front-end developers"}', '{"Print designers","3D artists","Users needing offline-only tools"}', 'Figma remains the industry standard for product design, and its AI features are making tedious tasks disappear. The AI capabilities are still evolving but already save meaningful time on layer management and asset creation.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Uizard', 'uizard', 'AI-powered UI design from text and sketches', 'Uizard is an AI design tool that transforms text descriptions, hand-drawn sketches, and screenshots into editable digital designs. It enables non-designers to create professional-looking app mockups, websites, and UI components without traditional design skills.', 'https://uizard.io', 'freemium', '[{"plan":"Free","price":"$0","features":["3 projects","Basic AI features","Limited screens"]},{"plan":"Pro","price":"$19/mo","features":["Unlimited projects","All AI features","Export options"]},{"plan":"Business","price":"$39/mo","features":["Team collaboration","Custom branding","Priority support"]}]', 'beginner', false, '{web}', '{"Text to design","Sketch to digital","Screenshot to design","Theme generation","Component library","Real-time collaboration"}', '{"Figma","Sketch","Slack"}', 'https://uizard.io/help', true, '{"Product managers","Startup founders","Non-designers needing mockups"}', '{"Professional UI designers","Pixel-perfect design needs","Print design projects"}', 'Uizard is a game-changer for non-designers who need to communicate UI ideas quickly. The text-to-design feature is genuinely useful for early-stage prototyping, though professional designers will find the output too generic.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Galileo AI', 'galileo-ai', 'AI-generated UI designs from text prompts', 'Galileo AI generates high-fidelity UI designs from natural language descriptions. It creates editable designs with real content, proper layout hierarchy, and consistent styling, dramatically accelerating the early design phase from concept to visual mockup.', 'https://usegalileo.ai', 'paid', '[{"plan":"Pro","price":"$19/mo","features":["Unlimited generations","Figma export","Multiple styles"]},{"plan":"Team","price":"Custom","features":["Team workspace","Custom brand styles","Priority generation"]}]', 'beginner', false, '{web}', '{"Text to UI design","High-fidelity output","Figma export","Style customization","Real content generation","Responsive layouts"}', '{"Figma","Sketch","Web browsers"}', 'https://usegalileo.ai/docs', true, '{"Designers wanting faster first drafts","Product teams exploring concepts","Startup founders prototyping"}', '{"Developers wanting code output","Teams needing production-ready designs","Users wanting free tools"}', 'Galileo AI produces impressively polished UI designs from simple text prompts, often surpassing what non-designers could create manually. It is best used as a starting point for design exploration rather than a final output tool.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Relume', 'relume', 'AI-powered website wireframe and sitemap generator', 'Relume uses AI to generate complete website wireframes and sitemaps from simple text prompts. It creates structured layouts with proper content hierarchy, exports to Figma and Webflow, and offers a library of pre-built components to accelerate web design workflows.', 'https://relume.io', 'freemium', '[{"plan":"Free","price":"$0","features":["AI sitemap generator","Limited exports"]},{"plan":"Starter","price":"$38/mo","features":["Figma export","Webflow export","AI wireframes"]},{"plan":"Pro","price":"$58/mo","features":["Unlimited exports","All components","Priority support"]}]', 'intermediate', false, '{web}', '{"AI sitemap generation","AI wireframe generation","Figma export","Webflow export","Component library","Content generation"}', '{"Figma","Webflow","Web browsers"}', 'https://www.relume.io/resources', true, '{"Web designers","Agency teams","Freelance designers building sites"}', '{"Mobile app designers","Non-web design projects","Users needing free tools"}', 'Relume has become essential for web designers, cutting wireframing time from days to minutes. The Figma and Webflow export pipeline is seamless, making it a no-brainer for anyone regularly building websites.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Magician', 'magician', 'AI design assistant for Figma', 'Magician is a Figma plugin that brings AI magic directly into your design workflow. It generates icons, images, copy, and UI components from text descriptions, all without leaving Figma, making it the quickest way to fill designs with AI-generated content.', 'https://magician.design', 'paid', '[{"plan":"Pro","price":"$5/mo","features":["AI icon generation","AI copywriting","AI image generation","Figma integration"]}]', 'intermediate', false, '{web}', '{"AI icon generation","AI copywriting","Image generation in Figma","Component suggestions","Text to design elements","Magic expand"}', '{"Figma"}', 'https://magician.design/docs', true, '{"Figma users wanting AI shortcuts","Designers needing placeholder content","UI designers iterating quickly"}', '{"Non-Figma users","Print designers","Users needing production-quality images"}', 'Magician is a delightful Figma plugin that saves real time on repetitive design tasks. At just five dollars a month, the AI icon and copy generation pay for themselves within the first hour of use.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Locofy', 'locofy', 'Convert designs to production-ready code', 'Locofy uses AI to convert Figma and Adobe XD designs into clean, responsive code for React, Next.js, Vue, HTML/CSS, and more. It maps design elements to reusable components, handles responsive breakpoints, and integrates with popular frontend frameworks automatically.', 'https://locofy.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic code export","Limited components"]},{"plan":"Pro","price":"$25/mo","features":["All frameworks","Responsive export","Component mapping"]},{"plan":"Enterprise","price":"Custom","features":["Custom design system","API access","Priority support"]}]', 'intermediate', true, '{web}', '{"Design to React","Design to Next.js","Responsive code","Component mapping","Figma plugin","Multi-framework export"}', '{"Figma","Adobe XD","GitHub","VS Code"}', 'https://docs.locofy.ai', true, '{"Front-end developers","Design-to-dev teams","Agencies handling many projects"}', '{"Backend developers","Teams with custom design systems","Projects needing pixel-perfect code"}', 'Locofy produces surprisingly clean code from Figma designs, especially for standard layouts and component patterns. It will not replace hand-coded frontends for complex apps, but it dramatically speeds up the design-to-code handoff.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Anima', 'anima', 'Design to React, Vue, and HTML converter', 'Anima converts Figma, Sketch, and Adobe XD designs into developer-friendly React, Vue, and HTML code. It supports design tokens, responsive breakpoints, and interactive prototypes, bridging the gap between designers and developers with intelligent code generation.', 'https://animaapp.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic export","Limited projects"]},{"plan":"Pro","price":"$39/mo","features":["React/Vue export","Responsive code","Unlimited projects"]},{"plan":"Team","price":"$79/mo","features":["Team collaboration","Storybook integration","Custom settings"]}]', 'intermediate', true, '{web}', '{"Figma to code","React export","Vue export","HTML/CSS export","Responsive breakpoints","Design token support"}', '{"Figma","Sketch","Adobe XD","Storybook"}', 'https://docs.animaapp.com', true, '{"Design-to-dev teams","Front-end developers","Product teams accelerating development"}', '{"Backend developers","Users not using Figma/Sketch/XD","Teams with fully custom code pipelines"}', 'Anima is a mature design-to-code tool that handles standard UI patterns well. The multi-framework support and Storybook integration make it particularly useful for teams maintaining component libraries.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Khroma', 'khroma', 'AI color palette generator trained on your preferences', 'Khroma is an AI-powered color tool that learns your color preferences to generate unlimited palettes you will actually like. After training on 50 colors you select, it creates personalized combinations displayed as typography, gradients, palettes, and custom images.', 'https://khroma.co', 'free', '[{"plan":"Free","price":"$0","features":["AI color generation","Personalized palettes","Unlimited combinations","Save favorites"]}]', 'beginner', false, '{web}', '{"Personalized color generation","Typography previews","Gradient previews","Color search","Favorites library","Accessibility contrast info"}', '{"Web browsers","Figma","Sketch"}', 'https://khroma.co/about', true, '{"Designers exploring color palettes","Brand designers","Web designers choosing color schemes"}', '{"Users needing exact brand color matching","Print designers needing Pantone support"}', 'Khroma is a clever approach to color palette generation that actually improves over time as it learns your taste. It is completely free and genuinely useful for the early exploration phase of any design project.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Remove.bg', 'removebg', 'AI-powered background removal in seconds', 'Remove.bg uses AI to instantly remove backgrounds from any image with remarkable precision. It handles complex edges like hair and fur with ease, supports batch processing, and offers both a web interface and API for automated workflows.', 'https://remove.bg', 'freemium', '[{"plan":"Free","price":"$0","features":["Preview quality downloads","Basic editing"]},{"plan":"Pay-as-you-go","price":"From $0.20/image","features":["Full quality downloads","API access"]},{"plan":"Subscription","price":"From $9/mo","features":["40 credits/mo","API access","Priority processing"]}]', 'beginner', true, '{web,api}', '{"Instant background removal","Hair and edge detection","Batch processing","Custom backgrounds","API access","Photoshop plugin"}', '{"Photoshop","Shopify","Zapier","Canva"}', 'https://www.remove.bg/api', true, '{"E-commerce sellers","Photographers","Social media managers"}', '{"Users needing complex image editing","Professional retouchers wanting manual control"}', 'Remove.bg remains the gold standard for automated background removal, with edge detection that is consistently impressive. The free tier is limited to preview quality, but the pay-as-you-go model is fair for occasional use.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Photoroom', 'photoroom', 'AI photo editor for product and marketing images', 'Photoroom is an AI-powered photo editing app specializing in product photography and marketing visuals. It automatically removes backgrounds, generates studio-quality product shots, creates consistent brand imagery, and offers batch editing for e-commerce catalogs.', 'https://photoroom.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Background removal","Basic editing","Watermarked exports"]},{"plan":"Pro","price":"$12.99/mo","features":["No watermark","HD exports","Batch editing","AI backgrounds"]},{"plan":"Enterprise","price":"Custom","features":["API access","Custom templates","Team features"]}]', 'beginner', true, '{web,mobile,api}', '{"AI background removal","Product shot generation","Batch editing","Brand kit","AI scene generation","Template library"}', '{"Shopify","WooCommerce","Etsy","Canva"}', 'https://photoroom.com/api', true, '{"E-commerce businesses","Small business owners","Social media marketers"}', '{"Professional photographers","Users needing RAW editing","Print production teams"}', 'Photoroom is remarkably good at turning amateur product photos into professional-looking images. For e-commerce sellers and small businesses, it replaces what used to require a photo studio and a designer.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Clipdrop', 'clipdrop', 'AI-powered creative image editing suite', 'Clipdrop by Stability AI offers a suite of AI image editing tools including background removal, image upscaling, relighting, text removal, and generative fill. It combines multiple AI capabilities into one platform, making advanced image manipulation accessible to everyone.', 'https://clipdrop.co', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic tools","Limited resolution","Watermarks"]},{"plan":"Pro","price":"$9/mo","features":["HD processing","No watermarks","All tools","Batch processing"]}]', 'beginner', true, '{web,api,mobile}', '{"Background removal","Image upscaling","Relighting","Text removal","Generative fill","Stable Diffusion XL"}', '{"Figma","Photoshop","Web browsers","Stability AI"}', 'https://clipdrop.co/apis', true, '{"Content creators","Marketers needing quick edits","Designers prototyping visuals"}', '{"Professional photo retouchers","Users needing print-ready output"}', 'Clipdrop packs an impressive array of AI editing tools at a very reasonable price. The quality of each individual tool is good enough for most use cases, making it excellent value as an all-in-one solution.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Vectorizer.ai', 'vectorizer-ai', 'AI-powered bitmap to vector conversion', 'Vectorizer.ai converts raster images (PNG, JPG) into clean vector graphics (SVG) using advanced AI. Unlike traditional auto-trace tools, it understands shapes, curves, and colors to produce professional-quality vectors that are genuinely usable in production design work.', 'https://vectorizer.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Preview vectorization","Basic export"]},{"plan":"Pro","price":"$9.99/mo","features":["Full SVG export","Batch processing","API access","High resolution"]}]', 'beginner', true, '{web,api}', '{"AI vectorization","SVG export","Batch processing","Shape recognition","Color optimization","Detail preservation"}', '{"Figma","Illustrator","Web browsers"}', 'https://vectorizer.ai/api', true, '{"Graphic designers converting logos","Web developers needing SVGs","Brand teams scaling assets"}', '{"Users wanting raster editing","3D artists","Video editors"}', 'Vectorizer.ai produces noticeably better vector conversions than any other auto-trace tool. The AI genuinely understands shapes rather than just tracing edges, resulting in clean, editable SVGs.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Fontjoy', 'fontjoy', 'AI-powered font pairing generator', 'Fontjoy uses deep learning to generate font combinations with a focus on visual harmony. It helps designers find complementary font pairings for headings, subheadings, and body text, with adjustable contrast levels to fine-tune the relationship between typefaces.', 'https://fontjoy.com', 'free', '[{"plan":"Free","price":"$0","features":["AI font pairing","Adjustable contrast","Google Fonts integration","Live preview"]}]', 'beginner', false, '{web}', '{"AI font pairing","Contrast adjustment","Live preview","Google Fonts library","Lock and generate","Typography hierarchy"}', '{"Google Fonts","Web browsers"}', 'https://fontjoy.com', true, '{"Web designers choosing typography","Brand designers","Non-designers building websites"}', '{"Users needing custom font design","Print designers with specific typeface requirements"}', 'Fontjoy is a simple, free tool that solves a surprisingly difficult design problem. It takes the guesswork out of font pairing and is useful even for experienced designers looking for fresh combinations.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('ColorMagic', 'colormagic', 'AI color palette generator from keywords', 'ColorMagic generates beautiful color palettes from text descriptions and keywords. Simply describe a mood, theme, or concept, and the AI creates harmonious color combinations that match your vision, making color selection intuitive rather than technical.', 'https://colormagic.app', 'free', '[{"plan":"Free","price":"$0","features":["AI palette generation","Keyword-based creation","Export options","Save palettes"]}]', 'beginner', false, '{web}', '{"Text to color palette","Mood-based generation","Hex code export","Palette saving","Color harmony","Keyword interpretation"}', '{"Web browsers","Figma","Canva"}', 'https://colormagic.app', true, '{"Designers exploring color options","Non-designers choosing brand colors","Web developers picking themes"}', '{"Users needing exact color science","Print designers with Pantone requirements"}', 'ColorMagic turns the abstract process of color selection into something anyone can do well. Describing a mood and getting a usable palette back is genuinely faster than manual color wheel exploration.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Diagram', 'diagram', 'AI-powered design tools and Figma plugins', 'Diagram builds AI-powered design tools, including the popular Magician plugin for Figma. Their suite of tools uses generative AI to help designers create, iterate, and refine designs faster, covering everything from icon generation to UI copywriting within the design workflow.', 'https://diagram.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic tools","Limited generations"]},{"plan":"Pro","price":"$10/mo","features":["Unlimited generations","All tools","Priority access"]}]', 'intermediate', false, '{web}', '{"AI design generation","Figma plugins","Icon generation","Copy generation","Design automation","UI component creation"}', '{"Figma","Web browsers"}', 'https://diagram.com', true, '{"Product designers","Figma power users","Design teams wanting AI automation"}', '{"Non-Figma users","Print designers","3D artists"}', 'Diagram is pioneering the integration of AI into design workflows through thoughtful Figma plugins. Their tools feel like natural extensions of the design process rather than bolted-on AI features.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Musho', 'musho', 'AI website designer that generates real pages', 'Musho is an AI website builder that generates complete, beautiful web pages from text prompts. It creates responsive designs with real content, proper typography, and modern layouts that can be customized and exported, dramatically shortening the journey from idea to live site.', 'https://musho.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic generations","Limited exports"]},{"plan":"Pro","price":"$20/mo","features":["Unlimited generations","Custom domain","Full export","Priority generation"]}]', 'beginner', false, '{web}', '{"Text to website","Responsive design","Real content generation","Custom styling","Export to code","Landing page creation"}', '{"Vercel","Netlify","Web browsers"}', 'https://musho.ai/docs', true, '{"Founders needing landing pages","Marketers creating campaigns","Freelancers building client sites"}', '{"Complex web application developers","Enterprise teams with design systems","Users needing CMS integration"}', 'Musho generates surprisingly polished landing pages from simple prompts, often looking better than many manually built sites. It is ideal for quick landing pages but not suited for complex multi-page applications.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Durable', 'durable', 'AI website builder in 30 seconds', 'Durable is an AI-powered website builder that generates a complete business website in under a minute. It creates professional sites with AI-generated copy, images, and contact forms, then offers CRM, invoicing, and marketing tools to run your business from one platform.', 'https://durable.co', 'paid', '[{"plan":"Starter","price":"$15/mo","features":["AI website","CRM","Invoicing","Custom domain"]},{"plan":"Business","price":"$25/mo","features":["All Starter features","SEO tools","Blog","Advanced analytics"]}]', 'beginner', false, '{web}', '{"30-second website generation","Built-in CRM","AI copywriting","Invoicing","SEO tools","Contact management"}', '{"Google Analytics","Stripe","Mailchimp"}', 'https://durable.co/help', true, '{"Small business owners","Service professionals","Freelancers needing a web presence"}', '{"E-commerce businesses","Developers wanting custom code","Large businesses with complex needs"}', 'Durable is impressively fast at getting a small business online, generating a functional site with real business tools in seconds. The built-in CRM and invoicing make it more than just a website builder for service businesses.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('10Web', 'ten-web', 'AI-powered WordPress website builder', '10Web is an AI-powered WordPress platform that generates complete websites from text descriptions. It handles hosting, speed optimization, security, and backups while offering a drag-and-drop editor powered by AI, making WordPress accessible without technical expertise.', 'https://10web.io', 'paid', '[{"plan":"Personal","price":"$10/mo","features":["1 website","AI builder","Hosting","SSL"]},{"plan":"Premium","price":"$15/mo","features":["3 websites","AI assistant","PageSpeed boost","SEO tools"]},{"plan":"Agency","price":"$23/mo","features":["10 websites","White label","Client management"]}]', 'beginner', false, '{web}', '{"AI WordPress generation","Managed hosting","Speed optimization","Security & backups","Drag-and-drop editor","WooCommerce support"}', '{"WordPress","WooCommerce","Elementor","Google Analytics"}', 'https://10web.io/help-center', true, '{"Small businesses wanting WordPress","Agencies managing multiple sites","Non-technical WordPress users"}', '{"Developers wanting custom WordPress setups","Enterprise with existing hosting","Non-WordPress users"}', '10Web takes the pain out of WordPress by handling hosting, speed, and security alongside AI site generation. It is the easiest path to a WordPress site, though power users may find the AI-generated output needs significant customization.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Webflow', 'webflow', 'Visual web development platform with AI features', 'Webflow is a professional visual web development platform that lets designers build responsive websites without writing code. With AI-powered features for content generation and optimization, it combines the power of code with the accessibility of visual design tools.', 'https://webflow.com', 'freemium', '[{"plan":"Free","price":"$0","features":["2 projects","Staging only","Webflow subdomain"]},{"plan":"Basic","price":"$18/mo","features":["Custom domain","150 pages","25K visits"]},{"plan":"Business","price":"$49/mo","features":["10K CMS items","Form submissions","Advanced features"]}]', 'intermediate', true, '{web}', '{"Visual web builder","CMS","E-commerce","Responsive design","Interactions & animations","AI content generation"}', '{"Figma","Slack","Zapier","Google Analytics"}', 'https://university.webflow.com', true, '{"Web designers wanting code-level control","Marketing teams managing content","Agencies building client sites"}', '{"Developers preferring code","Simple blog needs","Users wanting drag-and-drop simplicity"}', 'Webflow is the most powerful no-code web builder, offering design freedom that rivals hand-coded sites. The learning curve is steeper than simpler builders, but the output quality and flexibility are unmatched in the visual builder space.', now());

-- =============================================
-- DATA & ANALYTICS TOOLS (15)
-- =============================================

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Julius AI', 'julius-ai', 'AI-powered data analysis and visualization', 'Julius AI is a conversational data analysis tool that lets you chat with your data to generate insights, charts, and reports. Upload spreadsheets, CSVs, or connect databases, then ask questions in plain English to get instant analysis and beautiful visualizations.', 'https://julius.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic analysis","Limited messages","Chart generation"]},{"plan":"Pro","price":"$20/mo","features":["Unlimited analysis","Advanced charts","Data connections","Export options"]},{"plan":"Team","price":"$45/user/mo","features":["Collaboration","Shared datasets","Admin controls"]}]', 'beginner', true, '{web}', '{"Natural language analysis","Chart generation","Data cleaning","Statistical analysis","Report generation","Multi-format data import"}', '{"Google Sheets","PostgreSQL","MySQL","Snowflake"}', 'https://julius.ai/docs', true, '{"Business analysts without coding skills","Researchers analyzing datasets","Students working with data"}', '{"Data engineers needing ETL pipelines","Users with real-time streaming data needs"}', 'Julius AI makes data analysis genuinely accessible to non-technical users, producing accurate charts and insights from conversational prompts. It handles most common analysis tasks well, though complex statistical modeling still needs specialized tools.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('MonkeyLearn', 'monkeylearn', 'No-code text analytics with machine learning', 'MonkeyLearn is a no-code text analytics platform that uses machine learning to classify and extract information from text data. It offers pre-built and custom models for sentiment analysis, topic classification, keyword extraction, and more, making NLP accessible to business teams.', 'https://monkeylearn.com', 'freemium', '[{"plan":"Free","price":"$0","features":["300 queries/mo","Pre-built models","Basic dashboard"]},{"plan":"Team","price":"$299/mo","features":["10K queries/mo","Custom models","Integrations","Priority support"]},{"plan":"Business","price":"$999/mo","features":["100K queries/mo","Dedicated support","Custom integrations"]}]', 'beginner', true, '{web,api}', '{"Sentiment analysis","Topic classification","Keyword extraction","Custom model training","No-code interface","Real-time processing"}', '{"Google Sheets","Zapier","Zendesk","Freshdesk"}', 'https://monkeylearn.com/docs', true, '{"Customer support teams analyzing feedback","Marketing teams tracking sentiment","Product teams processing reviews"}', '{"Data scientists needing custom NLP models","Real-time streaming analysis","Budget-conscious small businesses"}', 'MonkeyLearn makes text analytics approachable for non-technical teams, with pre-built models that work well out of the box. The pricing can be steep for high-volume use, but the no-code model training is a genuine differentiator.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Obviously AI', 'obviously-ai', 'No-code machine learning predictions', 'Obviously AI enables anyone to build predictive ML models without writing code. Upload a dataset, select what you want to predict, and get a trained model with accuracy metrics in minutes. It handles classification, regression, and time series forecasting automatically.', 'https://obviously.ai', 'paid', '[{"plan":"Starter","price":"$75/mo","features":["5 datasets","10K predictions/mo","Basic support"]},{"plan":"Professional","price":"$195/mo","features":["Unlimited datasets","100K predictions/mo","API access","Integrations"]},{"plan":"Enterprise","price":"Custom","features":["Unlimited predictions","Dedicated support","Custom integrations"]}]', 'beginner', true, '{web,api}', '{"No-code ML","Automated model selection","Prediction API","Time series forecasting","Classification models","Regression models"}', '{"Zapier","Google Sheets","Salesforce","HubSpot"}', 'https://obviously.ai/docs', true, '{"Business teams needing predictions","Non-technical analysts","Startups without data science teams"}', '{"Data scientists needing model customization","Teams with complex ML pipelines","Budget-conscious users"}', 'Obviously AI delivers on its promise of accessible machine learning, producing surprisingly good models from simple CSV uploads. It is perfect for straightforward prediction tasks, though serious ML work still requires specialized tools.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('MindsDB', 'mindsdb', 'AI tables inside your existing database', 'MindsDB brings AI capabilities directly into your database through a SQL interface. It lets you create, train, and deploy ML models using standard SQL queries, making machine learning accessible to anyone who knows SQL without needing separate ML infrastructure or Python expertise.', 'https://mindsdb.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Community edition","Basic models","Local deployment"]},{"plan":"Pro","price":"$49/mo","features":["Cloud hosting","Advanced models","API access","Monitoring"]},{"plan":"Enterprise","price":"Custom","features":["Dedicated infrastructure","SSO","Priority support"]}]', 'intermediate', true, '{web,api}', '{"SQL-native ML","AI tables","LLM integration","Time series forecasting","Anomaly detection","Database federation"}', '{"MySQL","PostgreSQL","MongoDB","Snowflake"}', 'https://docs.mindsdb.com', true, '{"Data engineers wanting ML in SQL","Backend developers","Teams with existing database workflows"}', '{"Non-SQL users","Teams wanting visual ML tools","Beginners without database knowledge"}', 'MindsDB is brilliant for teams that think in SQL, bringing ML directly into database workflows without context switching. The ability to query ML models with SELECT statements is genuinely elegant and lowers the barrier to ML adoption.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Hex', 'hex', 'Collaborative data workspace with AI', 'Hex is a modern data workspace that combines SQL, Python, and no-code tools in a collaborative notebook environment. Its AI features help write queries, generate visualizations, and explain results, making it the most complete platform for data teams to analyze, visualize, and share insights.', 'https://hex.tech', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic notebooks","Community features"]},{"plan":"Professional","price":"$28/user/mo","features":["Unlimited projects","Scheduled runs","App publishing"]},{"plan":"Team","price":"$55/user/mo","features":["Collaboration","Git sync","Admin controls","AI features"]}]', 'intermediate', true, '{web}', '{"AI query generation","SQL and Python notebooks","Interactive visualizations","App publishing","Scheduled runs","Git integration"}', '{"Snowflake","BigQuery","Redshift","dbt"}', 'https://learn.hex.tech', true, '{"Data analysts and scientists","Analytics engineering teams","Data teams sharing insights"}', '{"Non-technical business users","Teams without a data warehouse","Individual hobbyists"}', 'Hex is arguably the best collaborative data workspace available, combining SQL, Python, and AI in a polished package. The ability to publish interactive data apps directly from notebooks is a killer feature for data teams.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Deepnote', 'deepnote', 'AI-powered collaborative data notebook', 'Deepnote is a collaborative data science notebook with built-in AI assistance. It offers real-time collaboration, AI-powered code generation, automatic visualizations, and seamless database connections, making it a modern alternative to Jupyter notebooks for team-based data work.', 'https://deepnote.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited notebooks","Basic AI features","Collaboration"]},{"plan":"Team","price":"$29/user/mo","features":["Advanced AI","Priority compute","Database connections","Version history"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Custom compute","Dedicated support"]}]', 'intermediate', true, '{web}', '{"AI code generation","Real-time collaboration","SQL integration","Auto-visualizations","Database connections","Scheduling"}', '{"Snowflake","BigQuery","PostgreSQL","S3"}', 'https://deepnote.com/docs', true, '{"Data science teams","Analysts collaborating on notebooks","Teams migrating from Jupyter"}', '{"Solo data scientists happy with Jupyter","Non-technical users","Teams needing production ML pipelines"}', 'Deepnote is what Jupyter notebooks should have been from the start, with collaboration and AI features that make team data work much smoother. The AI assistant genuinely speeds up exploratory analysis and chart creation.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Observable', 'observable', 'Interactive data visualization notebooks', 'Observable is a platform for creating interactive data visualizations and dashboards using JavaScript notebooks. It combines the exploratory power of notebooks with the interactivity of web applications, enabling data teams to build and share compelling data stories and live dashboards.', 'https://observablehq.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Public notebooks","Community features","Basic visualizations"]},{"plan":"Pro","price":"$15/user/mo","features":["Private notebooks","Database connections","Team features"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Embedded dashboards","Dedicated support"]}]', 'advanced', true, '{web}', '{"JavaScript notebooks","Interactive visualizations","D3.js integration","Database connections","Dashboard publishing","Real-time data"}', '{"PostgreSQL","Snowflake","BigQuery","GitHub"}', 'https://observablehq.com/documentation', true, '{"Data visualization specialists","JavaScript-savvy analysts","Teams building interactive dashboards"}', '{"Python-first data teams","Non-technical business users","Users unfamiliar with JavaScript"}', 'Observable is the premier platform for interactive data visualization, leveraging the full power of the web platform. The learning curve is real for non-JavaScript users, but the visual output quality is unmatched by any other notebook tool.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Mode', 'mode', 'Collaborative analytics platform with AI', 'Mode is an analytics platform that combines SQL, Python, and visual reporting in one workspace. It offers AI-powered query assistance, interactive dashboards, and team collaboration features, helping data teams go from question to insight to shared report in a single workflow.', 'https://mode.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Community features","Public reports","Basic SQL"]},{"plan":"Business","price":"Custom","features":["Private workspaces","Unlimited queries","Dashboard embedding","AI features"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Governance","Dedicated support"]}]', 'intermediate', true, '{web}', '{"SQL editor","Python notebooks","Visual reporting","AI query assistance","Dashboard embedding","Team collaboration"}', '{"Snowflake","BigQuery","Redshift","PostgreSQL"}', 'https://mode.com/help', true, '{"Analytics teams","BI analysts","Data teams needing SQL and visualization"}', '{"Non-technical users","Teams wanting self-service BI only","Small teams on tight budgets"}', 'Mode offers a complete analytics workflow from SQL to visualization in one tool, which is genuinely more efficient than juggling separate tools. The AI query assistance helps analysts work faster without sacrificing the power of writing custom SQL.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Metabase', 'metabase', 'Open source business intelligence and analytics', 'Metabase is an open-source BI tool that makes it easy to ask questions about your data and display answers in dashboards. Its intuitive query builder, automatic visualizations, and self-service approach let anyone in an organization explore data without writing SQL.', 'https://metabase.com', 'freemium', '[{"plan":"Open Source","price":"$0","features":["Self-hosted","Core features","Community support"]},{"plan":"Pro","price":"$85/mo (5 users)","features":["Advanced permissions","Audit logs","Serialization"]},{"plan":"Enterprise","price":"Custom","features":["Row-level permissions","SSO","Dedicated support"]}]', 'beginner', true, '{web,api}', '{"Visual query builder","Auto dashboards","SQL editor","Embedded analytics","Alerting","Self-service exploration"}', '{"PostgreSQL","MySQL","BigQuery","Snowflake"}', 'https://www.metabase.com/docs', true, '{"Teams wanting self-service BI","Startups needing affordable analytics","Companies embedding analytics"}', '{"Enterprise teams needing advanced governance","Data scientists needing notebook features","Real-time analytics needs"}', 'Metabase is the best open-source BI tool available, offering an intuitive experience that genuinely empowers non-technical users to explore data. The free self-hosted option makes it an unbeatable starting point for any team needing dashboards.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Akkio', 'akkio', 'No-code predictive AI for business teams', 'Akkio is a no-code AI platform that lets business teams build and deploy predictive models, generate reports, and chat with their data. It specializes in making machine learning accessible for marketing, sales, and operations teams without requiring data science expertise.', 'https://akkio.com', 'paid', '[{"plan":"Starter","price":"$49/mo","features":["5 datasets","Basic predictions","Chat with data"]},{"plan":"Professional","price":"$99/mo","features":["25 datasets","Advanced models","API access","Integrations"]},{"plan":"Enterprise","price":"Custom","features":["Unlimited datasets","Dedicated support","Custom models"]}]', 'beginner', true, '{web,api}', '{"No-code predictions","Chat with data","Automated reporting","Lead scoring","Churn prediction","Data visualization"}', '{"Salesforce","HubSpot","Google Sheets","Snowflake"}', 'https://akkio.com/help', true, '{"Marketing teams doing lead scoring","Sales teams predicting churn","Business analysts wanting ML"}', '{"Data scientists with custom model needs","Teams with real-time ML requirements"}', 'Akkio makes predictive analytics genuinely accessible to business teams, with pre-built use cases for common scenarios like lead scoring and churn prediction. The results are solid for standard business problems, making ML practical for teams without data scientists.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Polymer', 'polymer', 'AI-powered data visualization and exploration', 'Polymer turns spreadsheet data into interactive, searchable databases and beautiful visualizations using AI. It automatically identifies trends, creates charts, and builds dashboards, making it easy for anyone to derive insights from structured data without technical skills.', 'https://polymersearch.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic visualizations","Limited data"]},{"plan":"Starter","price":"$10/mo","features":["AI insights","Unlimited boards","Sharing"]},{"plan":"Pro","price":"$25/mo","features":["API access","Custom branding","Embedded dashboards"]}]', 'beginner', true, '{web,api}', '{"AI auto-visualization","Trend detection","Interactive dashboards","Data exploration","Embeddable boards","Auto-generated insights"}', '{"Google Sheets","Airtable","CSV","Shopify"}', 'https://polymersearch.com/docs', true, '{"Non-technical teams exploring data","E-commerce businesses tracking metrics","Marketing teams analyzing campaign data"}', '{"Data engineers needing ETL","Teams with complex data modeling needs"}', 'Polymer makes data visualization almost effortless, automatically choosing the right chart types and highlighting interesting patterns. It is particularly effective for e-commerce and marketing teams who live in spreadsheets.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Rows', 'rows', 'Spreadsheet with built-in AI and integrations', 'Rows is a modern spreadsheet that combines familiar spreadsheet functionality with built-in AI analysis, data integrations, and automation. It can pull data from APIs, analyze it with AI, and share results as interactive pages, making it a powerful upgrade from traditional spreadsheets.', 'https://rows.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic spreadsheets","Limited AI","Integrations"]},{"plan":"Pro","price":"$9/user/mo","features":["Unlimited AI","All integrations","Automation","Custom branding"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Advanced admin","Dedicated support"]}]', 'beginner', true, '{web}', '{"AI data analysis","Built-in integrations","API data pulling","Interactive sharing","Automation","Chat with spreadsheet"}', '{"Google Ads","Facebook Ads","Stripe","HubSpot"}', 'https://rows.com/docs', true, '{"Marketing teams tracking campaigns","Business analysts using spreadsheets","Teams pulling data from SaaS tools"}', '{"Data engineers needing databases","Users happy with Excel or Google Sheets","Complex data modeling needs"}', 'Rows reimagines what a spreadsheet can be, with built-in integrations that pull live data from dozens of services. The AI analysis features turn it from a data container into an insight generator, especially useful for marketing analytics.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Equals', 'equals', 'AI-powered spreadsheet for startups and finance teams', 'Equals is a next-generation spreadsheet designed for startups and finance teams, combining live database connections with AI-powered analysis. It connects directly to your data warehouse, supports SQL and spreadsheet formulas, and uses AI to help build models and generate insights.', 'https://equals.com', 'paid', '[{"plan":"Starter","price":"$49/mo","features":["5 users","Database connections","Basic AI"]},{"plan":"Professional","price":"$99/mo","features":["Unlimited users","Advanced AI","Snapshots","Version history"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Custom integrations","Dedicated support"]}]', 'intermediate', true, '{web}', '{"Live database connections","AI analysis","SQL support","Spreadsheet formulas","Version history","Collaborative editing"}', '{"Snowflake","BigQuery","PostgreSQL","Stripe"}', 'https://equals.com/docs', true, '{"Startup finance teams","Business operations teams","Analysts connecting to data warehouses"}', '{"Individual users on a budget","Teams without a data warehouse","Non-technical spreadsheet users"}', 'Equals is the spreadsheet that data-driven startups have been wanting, with live database connections that eliminate the copy-paste data workflow. The AI features are well-integrated and genuinely useful for financial modeling and analysis.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('ChatDB', 'chatdb', 'Chat with your database using natural language', 'ChatDB lets you query databases using natural language, automatically generating and executing SQL queries from plain English questions. It supports multiple database types, visualizes results, and helps non-technical users access database insights without learning SQL.', 'https://chatdb.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic queries","Limited database connections"]},{"plan":"Pro","price":"$25/mo","features":["Unlimited queries","Multiple databases","Chart generation","Team sharing"]}]', 'beginner', true, '{web}', '{"Natural language to SQL","Auto visualization","Multi-database support","Query history","Chart generation","Data export"}', '{"MySQL","PostgreSQL","MongoDB","SQLite"}', 'https://chatdb.ai/docs', true, '{"Non-technical team members needing data","Product managers querying databases","Small teams without dedicated analysts"}', '{"Data engineers needing complex queries","Teams with strict data governance","Users needing real-time dashboards"}', 'ChatDB is a straightforward tool that does one thing well: letting anyone ask questions of a database in plain English. The SQL generation is accurate for common queries, making it a practical bridge between data and non-technical teams.', now());

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES
('Baseten', 'baseten', 'ML model deployment and inference platform', 'Baseten is a platform for deploying and serving machine learning models at scale. It handles model packaging, GPU infrastructure, autoscaling, and API generation, letting ML teams go from trained model to production endpoint without managing infrastructure.', 'https://baseten.co', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic deployment","Limited compute","Community support"]},{"plan":"Pro","price":"Usage-based","features":["GPU access","Autoscaling","Async inference","Monitoring"]},{"plan":"Enterprise","price":"Custom","features":["VPC deployment","SLA","Dedicated support","Custom infrastructure"]}]', 'advanced', true, '{web,api}', '{"Model deployment","GPU autoscaling","Async inference","A/B testing","Model versioning","Performance monitoring"}', '{"Hugging Face","PyTorch","TensorFlow","S3"}', 'https://docs.baseten.co', true, '{"ML teams deploying models","AI startups scaling inference","Teams needing GPU infrastructure"}', '{"Non-technical users","Teams building models from scratch","Simple analytics use cases"}', 'Baseten simplifies ML deployment dramatically, handling the infrastructure complexity that usually slows down model shipping. The autoscaling and GPU management are genuinely well-engineered for production workloads.', now());


-- =============================================
-- CATEGORY LINKS
-- =============================================

-- Code & Development category links
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tabnine' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'codeium' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'amazon-codewhisperer' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sourcegraph-cody' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pieces-for-developers' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'windsurf' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'devin' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cline' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'continue-dev' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'openai-codex' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'phind' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'blackbox-ai' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'coderabbit' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sweep' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mintlify' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gitlab-duo' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'jetbrains-ai' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'warp' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fig' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'raycast' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'raycast' AND c.slug = 'code-development';

-- Design & UI category links
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'figma-ai' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'uizard' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'galileo-ai' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'relume' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'magician' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'locofy' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'locofy' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'anima' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'anima' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'khroma' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'removebg' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'photoroom' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'clipdrop' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'clipdrop' AND c.slug = 'image-generation';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'vectorizer-ai' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fontjoy' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'colormagic' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'diagram' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'musho' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'durable' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ten-web' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'webflow' AND c.slug = 'design-ui';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'webflow' AND c.slug = 'code-development';

-- Data & Analytics category links
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'julius-ai' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'monkeylearn' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'obviously-ai' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mindsdb' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mindsdb' AND c.slug = 'code-development';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hex' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'deepnote' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'observable' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mode' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'metabase' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'akkio' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'polymer' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rows' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rows' AND c.slug = 'productivity';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'equals' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'equals' AND c.slug = 'business-finance';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatdb' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'baseten' AND c.slug = 'data-analytics';

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'baseten' AND c.slug = 'code-development';


-- =============================================
-- TAG LINKS
-- =============================================

-- Code & Development tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tabnine' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tabnine' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'codeium' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'codeium' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'amazon-codewhisperer' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'amazon-codewhisperer' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sourcegraph-cody' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sourcegraph-cody' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pieces-for-developers' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pieces-for-developers' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'windsurf' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'windsurf' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'devin' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'devin' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'devin' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'cline' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'cline' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'cline' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'continue-dev' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'continue-dev' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'openai-codex' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'openai-codex' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'openai-codex' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'phind' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'phind' AND tg.slug = 'research';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'blackbox-ai' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'blackbox-ai' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'coderabbit' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'coderabbit' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sweep' AND tg.slug = 'agent';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sweep' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mintlify' AND tg.slug = 'writing-assistant';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mintlify' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gitlab-duo' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gitlab-duo' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'jetbrains-ai' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'jetbrains-ai' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'warp' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'warp' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fig' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fig' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'raycast' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'raycast' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'raycast' AND tg.slug = 'chatbot';

-- Design & UI tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'figma-ai' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'figma-ai' AND tg.slug = 'prototyping';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'uizard' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'uizard' AND tg.slug = 'prototyping';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'uizard' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'galileo-ai' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'galileo-ai' AND tg.slug = 'prototyping';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'relume' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'relume' AND tg.slug = 'prototyping';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'magician' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'magician' AND tg.slug = 'image-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'locofy' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'locofy' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'anima' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'anima' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'khroma' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'removebg' AND tg.slug = 'photo-editing';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'removebg' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'photoroom' AND tg.slug = 'photo-editing';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'photoroom' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clipdrop' AND tg.slug = 'photo-editing';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clipdrop' AND tg.slug = 'image-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'vectorizer-ai' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'vectorizer-ai' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fontjoy' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'colormagic' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'diagram' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'diagram' AND tg.slug = 'prototyping';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'musho' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'musho' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'durable' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'durable' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ten-web' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'ten-web' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'webflow' AND tg.slug = 'design';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'webflow' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'webflow' AND tg.slug = 'code-generation';

-- Data & Analytics tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'julius-ai' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'julius-ai' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'monkeylearn' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'monkeylearn' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'monkeylearn' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'obviously-ai' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'obviously-ai' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mindsdb' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mindsdb' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mindsdb' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'hex' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'hex' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'deepnote' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'deepnote' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'observable' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'observable' AND tg.slug = 'code-generation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mode' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mode' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'metabase' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'metabase' AND tg.slug = 'open-source';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'metabase' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'akkio' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'akkio' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'polymer' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'polymer' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'rows' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'rows' AND tg.slug = 'automation';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'equals' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'equals' AND tg.slug = 'workflow';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatdb' AND tg.slug = 'data-analysis';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatdb' AND tg.slug = 'chatbot';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatdb' AND tg.slug = 'no-code';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'baseten' AND tg.slug = 'api-tool';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'baseten' AND tg.slug = 'automation';

COMMIT;

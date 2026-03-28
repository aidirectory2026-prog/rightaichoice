import type Anthropic from '@anthropic-ai/sdk'

export const SYSTEM_PROMPT = `You are the AI assistant for RightAIChoice — a platform that helps people discover and choose the right AI tools for their needs.

## Your Role
You are a knowledgeable AI tool advisor. You help users find the best AI tools based on their specific use case, budget, skill level, and requirements.

## How You Work
1. When a user describes what they want to do, use the search_tools function to find relevant tools in our database.
2. Analyze the results and recommend the best options with clear reasoning.
3. Ask follow-up questions if the user's needs are unclear.

## Response Guidelines
- Be concise and direct. Lead with recommendations, not preamble.
- Always reference actual tools from the database — never invent tools.
- For each recommendation, explain WHY it fits the user's needs.
- If relevant, mention pricing, skill level, and key differentiators.
- When comparing tools, highlight trade-offs honestly.
- If no tools match well, say so — don't force bad recommendations.
- Use markdown formatting: **bold** for tool names, bullet points for lists.
- When mentioning a tool, include its slug in this format: [[tool:SLUG]] so we can render it as a clickable card. Example: [[tool:chatgpt]]

## Follow-up Behavior
- If the user's request is vague, ask 1-2 clarifying questions (budget? skill level? specific features needed?)
- If you've already recommended tools, ask if they want more details, alternatives, or comparisons.
- Be conversational but efficient — respect the user's time.

## What You Don't Do
- Don't make up tools that aren't in the database.
- Don't provide overly generic advice — be specific.
- Don't write essays. Keep responses focused and scannable.
- Don't recommend tools without searching first.`

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_tools',
    description:
      'Search the RightAIChoice database for AI tools. Use this to find tools matching a user\'s needs. You can search by keywords, filter by pricing type, category, skill level, and platform. Always search before recommending tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Search keywords describing what the user wants (e.g., "video editing AI", "free writing assistant", "code generation"). Extract the core intent from the user\'s message.',
        },
        pricing_type: {
          type: 'string',
          enum: ['free', 'freemium', 'paid', 'contact'],
          description: 'Filter by pricing model. Only set if user mentions budget constraints.',
        },
        skill_level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Filter by required skill level. Only set if user mentions their experience.',
        },
        platform: {
          type: 'string',
          enum: ['web', 'mobile', 'desktop', 'api', 'plugin', 'cli'],
          description: 'Filter by platform. Only set if user specifies a platform preference.',
        },
        has_api: {
          type: 'boolean',
          description: 'Filter for tools with API access. Only set if user needs programmatic access.',
        },
        category: {
          type: 'string',
          description:
            'Filter by category slug (e.g., "writing", "image-generation", "coding"). Only set if you can clearly map the user\'s need to a category.',
        },
      },
      required: ['query'],
    },
  },
]

// AI Provider configuration for time period extraction

export type AIProvider = 'deepseek' | 'gemini' | 'groq';

export interface AIProviderConfig {
  name: string;
  priority: number; // Lower = higher priority (1 = highest)
  enabled: boolean;
  rateLimitPerHour: number;
  costPer1MTokens: {
    input: number;
    output: number;
  };
  reasoning: 'high' | 'medium' | 'low';
  description: string;
}

export const aiProviders: Record<AIProvider, AIProviderConfig> = {
  deepseek: {
    name: 'DeepSeek-V3',
    priority: 1, // Highest priority for reasoning capability
    enabled: true,
    rateLimitPerHour: 50,
    costPer1MTokens: {
      input: 0.27,
      output: 1.10,
    },
    reasoning: 'high',
    description: 'OpenAI o1-level reasoning, best for modern movies and complex plots',
  },
  gemini: {
    name: 'Gemini Flash 2.0',
    priority: 2, // Fallback with good cost/performance
    enabled: true,
    rateLimitPerHour: 50,
    costPer1MTokens: {
      input: 0.075,
      output: 0.30,
    },
    reasoning: 'medium',
    description: 'Fast and cost-effective, good for most movies',
  },
  groq: {
    name: 'Groq (Llama 3.1)',
    priority: 3, // Last resort - ultra-fast but lower reasoning
    enabled: false, // Disabled by default, can be enabled if needed
    rateLimitPerHour: 100,
    costPer1MTokens: {
      input: 0.05,
      output: 0.08,
    },
    reasoning: 'low',
    description: 'Ultra-fast inference, emergency fallback',
  },
};

/**
 * Get AI providers sorted by priority
 * Only returns enabled providers
 */
export function getAIProvidersByPriority(): AIProvider[] {
  return (Object.entries(aiProviders) as [AIProvider, AIProviderConfig][])
    .filter(([_, config]) => config.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([provider, _]) => provider);
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  return aiProviders[provider];
}

/**
 * Feature flag: Use AI providers for time period extraction
 * If false, falls back to keyword-based extraction only
 */
export const useAIExtraction = true;

/**
 * Fallback strategy order:
 * 1. TMDb metadata (year from movie data)
 * 2. Wikipedia API (structured time period data)
 * 3. DeepSeek-V3 (high reasoning AI)
 * 4. Gemini Flash (cost-effective AI)
 * 5. Groq (ultra-fast AI, if enabled)
 * 6. Keyword extraction (regex patterns)
 */
export const extractionStrategy = [
  'tmdb',
  'wikipedia',
  'deepseek',
  'gemini',
  'groq',
  'keyword',
] as const;

export type ExtractionMethod = typeof extractionStrategy[number];

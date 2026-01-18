// DeepSeek API client for time period extraction

// Feature flag: プロキシ経由でAPIを呼び出す（本番環境推奨）
const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === 'true';

// レガシー: 直接呼び出し用（フォールバック、開発環境のみ）
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model?: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Extract time period from movie plot using DeepSeek-V3
 */
export async function extractTimePeriodWithDeepSeek(
  title: string,
  overview: string,
  releaseYear: number
): Promise<{ startYear: number | null; endYear: number | null; confidence: number }> {
  const systemPrompt = `You are a movie time period analyzer. Analyze the movie plot and determine the time period when the story takes place.

IMPORTANT RULES:
1. Return ONLY the year or year range, nothing else
2. For modern movies (2000s-2020s), be precise about the decade
3. Consider technology, events, and cultural references to determine the exact time period
4. If the movie has multiple time periods (time travel), return the main time period only
5. If the story is clearly set in the present day relative to the release year, return the release year

FORMAT:
- Single year: "2015"
- Year range: "2010-2015"
- If uncertain: return the release year

EXAMPLES:
- "Yesterday" (2019): Story about a modern musician who wakes up in a world where The Beatles never existed → "2019" (present day)
- "The Social Network" (2010): Story of Facebook's founding → "2003" (actual Facebook founding year)
- "Titanic" (1997): Story of the ship sinking → "1912"
- "Back to the Future" (1985): Time travel between 1985 and 1955 → "1985" (main time period)`;

  const userPrompt = `Movie: "${title}" (${releaseYear})
Plot: ${overview}

What year or year range does this story take place? Reply with ONLY the year(s).`;

  try {
    const response = await (USE_PROXY
      ? // プロキシ経由（APIキー不要）
        fetch('/api/deepseek-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3, // Lower temperature for more consistent results
            max_tokens: 100, // Short response expected
          } as DeepSeekRequest),
        })
      : // 直接呼び出し（開発環境フォールバック）
        fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 100,
          }),
        }));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data: DeepSeekResponse = await response.json();

    const content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No content in DeepSeek response');
    }

    // Parse the response
    const yearMatch = content.match(/(\d{4})(?:-(\d{4}))?/);
    if (!yearMatch) {
      console.warn('DeepSeek response does not contain valid year:', content);
      return { startYear: null, endYear: null, confidence: 0 };
    }

    const startYear = parseInt(yearMatch[1], 10);
    const endYear = yearMatch[2] ? parseInt(yearMatch[2], 10) : null;

    // Confidence based on how specific the response is
    const confidence = yearMatch[2] ? 0.85 : 0.9; // Range = slightly lower confidence

    return { startYear, endYear, confidence };
  } catch (error) {
    console.error('DeepSeek extraction error:', error);
    return { startYear: null, endYear: null, confidence: 0 };
  }
}

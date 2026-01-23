// DeepSeek API client for time period extraction

import { TMDbMovieDetails } from './tmdbApi';
import { logger } from '../utils/logger';

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

export interface DeepSeekTimePeriodResult {
  success: boolean;
  startYear: number | null;
  endYear: number | null;
  period: string;
  additionalYears?: number[];
  confidence: 'high' | 'medium' | 'low';
  source: string;
  error?: string;
}

/**
 * Extract time period from movie plot using DeepSeek-V3
 */
export async function extractTimePeriodWithDeepSeek(
  movie: TMDbMovieDetails
): Promise<DeepSeekTimePeriodResult> {
  const releaseYear = movie.release_date?.split('-')[0] || 'unknown';
  const genres = movie.genres?.map(g => g.name).join(', ') || 'unknown';

  const prompt = `You are a movie time period expert. Extract the historical time period setting from this movie information.

Movie Title: ${movie.title}
Original Title: ${movie.original_title}
Release Year: ${releaseYear}
Overview (Japanese): ${movie.overview}
Overview (English): ${movie.overviewEn || 'N/A'}
Genres: ${genres}

CRITICAL INSTRUCTIONS FOR SEQUELS AND REMAKES:
- First, check if this is a sequel, prequel, or remake (look for keywords: "第1作目", "前作", "first film", "original", "sequel", "prequel", "remake", numbers like "2", "II", etc.)
- If it IS a sequel/prequel/remake, you MUST use your knowledge of the original film's time period setting
- Apply any relative time references (e.g., "10 years after", "decades later", "before the events of") to calculate the absolute year
- Even if the setting is fictional (Avatar's Pandora, Blade Runner's Los Angeles), calculate the year based on the franchise timeline

Instructions:
1. Identify if this is a sequel, prequel, or remake by analyzing the title and overview
2. If it's a sequel/prequel/remake:
   a. Recall the original film's time period setting from your knowledge
   b. Extract any relative time references from the overview
   c. Calculate the absolute year (e.g., Avatar 2009 is set in 2154, so "10 years later" = 2164)
   d. Return the calculated year with "high" confidence if you know the original film's setting
3. For standalone sci-fi movies set in a specific future year, extract that year even if the setting is fictional
4. If it's a time-travel movie, list additional significant years in additionalYears array
5. For pure fantasy with no real historical period and no specific year, AND not a sequel with calculable timeline, return startYear as null with period "NO_PERIOD"
6. For "A long time ago in a galaxy far away" type settings (Star Wars), return startYear as null with period "LONG_AGO"
7. For near-future settings (described as "近未来" or "near future"), return startYear as null with period "NEAR_FUTURE"
8. For century-based time periods (e.g., "19th century", "20th century"), return the mid-point year with "medium" confidence:
   - 19th century → 1850
   - 20th century → 1950
   - Calculate as: (century - 1) * 100 + 50
9. If the time period is contemporary (same as release year), use the release year

Respond ONLY in valid JSON format (no markdown, no code blocks):
{
  "startYear": number or null,
  "endYear": number or null,
  "additionalYears": [number] or null,
  "period": "descriptive string in Japanese or special keyword",
  "confidence": "high" | "medium" | "low"
}

Examples:
- Gladiator: {"startYear": 180, "endYear": null, "additionalYears": null, "period": "180年", "confidence": "high"}
- Star Wars Episode IV: {"startYear": null, "endYear": null, "additionalYears": null, "period": "LONG_AGO", "confidence": "high"}
- Interstellar: {"startYear": 2067, "endYear": null, "additionalYears": [2100, 2130], "period": "2067年", "confidence": "high"}
- Avatar (2009): {"startYear": 2154, "endYear": null, "additionalYears": null, "period": "2154年", "confidence": "high"}
- Avatar: The Way of Water (overview: "第1作目から約10年後"): {"startYear": 2167, "endYear": null, "additionalYears": null, "period": "2167年", "confidence": "high"}
- Blade Runner 2049 (title has "2049"): {"startYear": 2049, "endYear": null, "additionalYears": null, "period": "2049年", "confidence": "high"}
- Lord of the Rings (standalone fantasy, no timeline): {"startYear": null, "endYear": null, "additionalYears": null, "period": "NO_PERIOD", "confidence": "high"}
- Near-future sci-fi (overview: "近未来"): {"startYear": null, "endYear": null, "additionalYears": null, "period": "NEAR_FUTURE", "confidence": "high"}

JSON response:`;

  logger.debug(`🤖 DeepSeek-V3: Analyzing "${movie.title}"...`);

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
              { role: 'user', content: prompt },
            ],
            temperature: 0.1, // Lower temperature for more consistent results
            max_tokens: 2048,
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
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 2048,
          }),
        }));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ DeepSeek API error: ${response.status} ${response.statusText}`);
      logger.error(`❌ DeepSeek API error body:`, errorText);

      // レート制限エラーの検出
      if (response.status === 429) {
        logger.warn('⚠️ DeepSeek API rate limit exceeded');
        return {
          success: false,
          startYear: null,
          endYear: null,
          period: '時代不明',
          confidence: 'low',
          source: 'deepseek_rate_limit',
          error: 'DeepSeek API rate limit exceeded. Please try again later.',
        };
      }

      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: DeepSeekResponse = await response.json();

    const textResponse = data.choices[0]?.message?.content;
    if (!textResponse) {
      throw new Error('Empty response from DeepSeek API');
    }

    logger.debug(`🤖 DeepSeek raw response: ${textResponse}`);

    // JSON抽出（マークダウンコードブロックを除去）
    let jsonText = textResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    logger.debug(`✅ DeepSeek parsed result:`, result);

    return {
      success: true,
      startYear: result.startYear,
      endYear: result.endYear,
      period: result.period,
      additionalYears: result.additionalYears,
      confidence: result.confidence || 'medium',
      source: 'deepseek_v3',
    };

  } catch (error) {
    logger.error('DeepSeek API error:', error);
    return {
      success: false,
      startYear: null,
      endYear: null,
      period: '時代不明',
      confidence: 'low',
      source: 'deepseek_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

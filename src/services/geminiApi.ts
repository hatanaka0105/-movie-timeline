// Google Gemini Flash API クライアント
// 映画の時代設定を抽出するためのAI推論サービス

import { TMDbMovieDetails } from './tmdbApi';
import { logger } from '../utils/logger';

// Feature flag: プロキシ経由でAPIを呼び出す（本番環境推奨）
const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === 'true';

// レガシー: 直接呼び出し用（フォールバック）
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface GeminiTimePeriodResult {
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
 * Gemini Flash を使って映画の時代設定を抽出
 */
export async function extractTimePeriodWithGemini(
  movie: TMDbMovieDetails
): Promise<GeminiTimePeriodResult> {

  try {
    const releaseYear = movie.release_date?.split('-')[0] || 'unknown';
    const genres = movie.genres?.map(g => g.name).join(', ') || 'unknown';

    const prompt = `You are a movie time period expert. Extract the historical time period setting from this movie information.

Movie Title: ${movie.title}
Original Title: ${movie.original_title}
Release Year: ${releaseYear}
Overview (Japanese): ${movie.overview || 'N/A'}
Overview (English): ${movie.overviewEn || 'N/A'}
Genres: ${genres}

CRITICAL: Use ALL available information sources:
1. TITLE ANALYSIS: Check if the title contains year numbers (e.g., "1917", "2001", "2049", "1984")
2. GENRE INFERENCE: Use genres to narrow down time periods:
   - History genre → likely pre-1950
   - War genre → check which war (WWI=1914-1918, WWII=1939-1945, Vietnam=1960s-1970s, etc.)
   - Western genre → typically 1850-1900 (American Old West)
   - Period drama → use your knowledge of common period settings
3. YOUR KNOWLEDGE: If overview is insufficient, use your knowledge of the film:
   - "Caligula" → Roman Empire, AD 37-41
   - "Seven Samurai" → 1586, Sengoku period Japan
   - "Gladiator" → Roman Empire, ~180 AD
   - "The Ten Commandments" → Ancient Egypt, ~1300 BC
   - "Braveheart" → Scotland, 1300s
4. OVERVIEW KEYWORDS: Extract time references from overview

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

    logger.debug(`🤖 Gemini Flash: Analyzing "${movie.title}"...`);

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    };

    const response = await (USE_PROXY
      ? // プロキシ経由（APIキー不要）
        fetch('/api/gemini-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash-exp',
            action: 'generateContent',
            ...requestBody,
          }),
        })
      : // 直接呼び出し（開発環境フォールバック）
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        ));

    if (!response.ok) {
      const errorText = await response.text();

      // レート制限エラーの検出
      if (response.status === 429) {
        logger.warn('⚠️ Gemini API rate limit exceeded');
        return {
          success: false,
          startYear: null,
          endYear: null,
          period: '時代不明',
          confidence: 'low',
          source: 'gemini_rate_limit',
          error: 'API rate limit exceeded. Please try again later.',
        };
      }

      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const textResponse = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Empty response from Gemini API');
    }

    logger.debug(`🤖 Gemini raw response: ${textResponse}`);

    // JSON抽出（マークダウンコードブロックを除去）
    let jsonText = textResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    logger.debug(`✅ Gemini parsed result:`, result);

    return {
      success: true,
      startYear: result.startYear,
      endYear: result.endYear,
      period: result.period,
      additionalYears: result.additionalYears,
      confidence: result.confidence || 'medium',
      source: 'gemini_flash',
    };

  } catch (error) {
    logger.error('Gemini API error:', error);
    return {
      success: false,
      startYear: null,
      endYear: null,
      period: '時代不明',
      confidence: 'low',
      source: 'gemini_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

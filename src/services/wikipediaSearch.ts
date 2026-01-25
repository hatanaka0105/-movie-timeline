// Wikipedia Search API for TMDb fallback
// 無料で無制限に使えるWikipedia APIを使って映画を検索

import { TMDbMovie } from './tmdbApi';
import { logger } from '../utils/logger';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_JA_API_BASE = 'https://ja.wikipedia.org/w/api.php';

export interface WikipediaSearchResult {
  title: string;
  snippet: string;
  pageid: number;
  year?: number;
}

/**
 * Wikipedia OpenSearch APIで映画を検索
 * まず英語版で検索し、結果が少なければ日本語版も検索
 */
export async function searchMoviesOnWikipedia(query: string): Promise<TMDbMovie[]> {
  try {
    logger.debug(`📚 Wikipedia Search: "${query}"`);

    // 英語版Wikipediaで検索
    const enResults = await searchWikipedia(query, 'en');
    logger.debug(`📚 Wikipedia EN: ${enResults.length} results`);

    // 日本語版Wikipediaでも検索（補完）
    const jaResults = await searchWikipedia(query, 'ja');
    logger.debug(`📚 Wikipedia JA: ${jaResults.length} results`);

    // 結果を統合（重複排除）
    const allResults = [...enResults, ...jaResults];
    const uniqueResults = deduplicateResults(allResults);

    logger.debug(`📚 Wikipedia Total: ${uniqueResults.length} unique results`);

    // TMDb形式に変換
    const tmdbFormat = uniqueResults.map(convertToTMDbFormat);

    return tmdbFormat;
  } catch (error) {
    logger.error('Wikipedia search error:', error);
    return [];
  }
}

/**
 * Wikipedia Search API で検索実行
 */
async function searchWikipedia(
  query: string,
  lang: 'en' | 'ja'
): Promise<WikipediaSearchResult[]> {
  const baseUrl = lang === 'en' ? WIKIPEDIA_API_BASE : WIKIPEDIA_JA_API_BASE;

  // OpenSearch API を使用（シンプルで高速）
  const url = new URL(baseUrl);
  url.searchParams.append('action', 'opensearch');
  url.searchParams.append('search', `${query} film`); // "film" キーワードで映画に絞り込み
  url.searchParams.append('limit', '10');
  url.searchParams.append('format', 'json');
  url.searchParams.append('origin', '*'); // CORS対応

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      logger.warn(`⚠️ Wikipedia API ${lang} error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // OpenSearch APIの戻り値: [query, [titles], [descriptions], [urls]]
    if (!Array.isArray(data) || data.length < 4) {
      return [];
    }

    const [, titles, snippets, urls] = data;

    // 結果を統合
    const results: WikipediaSearchResult[] = titles.map((title: string, index: number) => {
      const snippet = snippets[index] || '';
      const url = urls[index] || '';
      const pageid = extractPageIdFromUrl(url);
      const year = extractYearFromTitle(title) || extractYearFromSnippet(snippet);

      return {
        title: cleanMovieTitle(title),
        snippet,
        pageid,
        year,
      };
    });

    // 映画関連のみにフィルタリング
    return results.filter(isMovieRelated);
  } catch (error) {
    logger.error(`Wikipedia ${lang} search error:`, error);
    return [];
  }
}

/**
 * Wikipedia URLからページIDを抽出
 */
function extractPageIdFromUrl(url: string): number {
  const match = url.match(/curid=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * タイトルから年号を抽出（例: "Gladiator (2000 film)" → 2000）
 */
function extractYearFromTitle(title: string): number | undefined {
  const match = title.match(/\((\d{4})\s*film\)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * スニペット（説明文）から年号を抽出
 */
function extractYearFromSnippet(snippet: string): number | undefined {
  // "released in 2000" のようなパターン
  const releaseMatch = snippet.match(/released in (\d{4})/i);
  if (releaseMatch) return parseInt(releaseMatch[1], 10);

  // "2000 American film" のようなパターン
  const yearMatch = snippet.match(/(\d{4})\s+\w+\s+film/i);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  // 最初に見つかった4桁の年号を使用（1900-2099）
  const genericMatch = snippet.match(/\b(19\d{2}|20\d{2})\b/);
  return genericMatch ? parseInt(genericMatch[1], 10) : undefined;
}

/**
 * タイトルをクリーンアップ（"(2000 film)" を削除）
 */
function cleanMovieTitle(title: string): string {
  return title.replace(/\s*\(\d{4}\s*film\)\s*/i, '').trim();
}

/**
 * 映画関連かどうかを判定
 */
function isMovieRelated(result: WikipediaSearchResult): boolean {
  const title = result.title.toLowerCase();
  const snippet = result.snippet.toLowerCase();

  // 映画関連キーワード
  const movieKeywords = ['film', 'movie', '映画', 'cinema'];
  const hasMovieKeyword = movieKeywords.some(
    (keyword) => title.includes(keyword) || snippet.includes(keyword)
  );

  // 除外キーワード（映画以外）
  const excludeKeywords = ['television', 'tv series', 'album', 'book', 'novel'];
  const hasExcludeKeyword = excludeKeywords.some(
    (keyword) => title.includes(keyword) || snippet.includes(keyword)
  );

  return hasMovieKeyword && !hasExcludeKeyword;
}

/**
 * 結果の重複を排除（タイトルの類似度で判定）
 */
function deduplicateResults(results: WikipediaSearchResult[]): WikipediaSearchResult[] {
  const seen = new Set<string>();
  const unique: WikipediaSearchResult[] = [];

  for (const result of results) {
    const normalizedTitle = result.title.toLowerCase().replace(/[^\w\s]/g, '');

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Wikipedia結果をTMDb形式に変換
 */
function convertToTMDbFormat(result: WikipediaSearchResult): TMDbMovie {
  return {
    id: result.pageid, // WikipediaのページIDを使用
    title: result.title,
    original_title: result.title,
    overview: result.snippet || '',
    release_date: result.year ? `${result.year}-01-01` : '',
    poster_path: null, // Wikipediaには画像情報がないのでnull
    backdrop_path: null,
    vote_average: 0,
    vote_count: 0,
    popularity: 0,
    genre_ids: [],
    adult: false,
    original_language: 'en',
    video: false,
  };
}

// AI駆動の時代設定検索サービス
// TMDbデータとデータベースの両方で時代設定が不明な場合に使用

import { MovieTimePeriodEntry, movieTimePeriodDb } from './movieTimePeriodDb';
import { TMDbMovieDetails } from './tmdbApi';
import { logger } from '../utils/logger';
import { CENTURY_OFFSETS, YEAR_RANGE } from '../config/constants';
import { extractTimePeriodWithDeepSeek } from './deepseekApi';
import { extractTimePeriodWithGemini } from './geminiApi';
import { extractTimePeriodWithGroq } from './groqApi';
import { getTimePeriodFromSharedDb, saveTimePeriodToSharedDb } from './sharedDbApi';

interface LookupResult {
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
 * キャッシュの信頼性を判定
 * 低信頼性の場合は再試行可能とする
 */
function determineReliability(
  result: LookupResult,
  movie: TMDbMovieDetails
): 'high' | 'low' {
  // 年代が特定できた場合は高信頼性
  if (result.startYear !== null) {
    return 'high';
  }

  // ここから先は startYear === null (時代不明) の場合

  const genres = movie.genres?.map(g => g.name.toLowerCase()) || [];
  const isFantasy = genres.some(g =>
    g.includes('fantasy') ||
    g.includes('animation') ||
    g.includes('family')
  );
  const isSciFi = genres.some(g => g.includes('science fiction'));

  // ファンタジー/アニメで NO_PERIOD や LONG_AGO の場合は高信頼性
  // (意図的に時代設定がない作品として妥当)
  if (isFantasy && (result.period === 'NO_PERIOD' || result.period === 'LONG_AGO')) {
    return 'high';
  }

  // SF作品で時代不明の場合は低信頼性
  // (SFは通常具体的な年代設定があるはず)
  if (isSciFi) {
    logger.debug(`🔍 SF movie "${movie.title}" has no period - marking as low reliability`);
    return 'low';
  }

  // 最終フォールバック（Groq）まで到達して失敗した場合は低信頼性
  if (result.source === 'groq_error' || result.source === 'groq_rate_limit') {
    logger.debug(`🔍 Movie "${movie.title}" failed at final fallback - marking as low reliability`);
    return 'low';
  }

  // AI の confidence が low の場合は低信頼性
  if (result.confidence === 'low') {
    logger.debug(`🔍 AI confidence is low for "${movie.title}" - marking as low reliability`);
    return 'low';
  }

  // Wikipedia で見つからなかった場合は低信頼性
  if (result.source === 'wikipedia_not_found' || result.source === 'wikipedia_no_period') {
    logger.debug(`🔍 Wikipedia not found for "${movie.title}" - marking as low reliability`);
    return 'low';
  }

  // エラーで失敗した場合（レート制限以外）は低信頼性
  if (result.source.includes('error')) {
    logger.debug(`🔍 Error occurred for "${movie.title}" - marking as low reliability`);
    return 'low';
  }

  // ファンタジーでない作品で時代不明の場合は低信頼性
  if (!isFantasy) {
    logger.debug(`🔍 Non-fantasy movie "${movie.title}" has no period - marking as low reliability`);
    return 'low';
  }

  // その他の場合は高信頼性
  return 'high';
}

// WikipediaからMovie時代設定を取得
export async function lookupMovieTimePeriod(
  movie: TMDbMovieDetails
): Promise<LookupResult> {
  try {
    const releaseYear = movie.release_date?.split('-')[0];
    logger.debug(`🔍 Wikipedia Lookup: Searching for time period of "${movie.title}"...`);

    // 1. Wikipedia ページを検索
    const searchQuery = `${movie.original_title} ${releaseYear} film`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=3&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MovieTimeline/1.0 (Educational Project)',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const titles = searchData[1] as string[];

    if (titles.length === 0) {
      logger.debug(`❌ No Wikipedia page found for "${movie.title}"`);
      return {
        success: false,
        startYear: null,
        endYear: null,
        period: '時代不明',
        confidence: 'low',
        source: 'wikipedia_not_found',
        error: 'No Wikipedia page found',
      };
    }

    // 2. 最初の結果のページ詳細を取得（prop=extractsで最初の数段落を取得）
    for (const pageTitle of titles) {
      try {
        // Wikipedia Action APIを使用してより詳細なextractを取得
        // exintro=1: 導入部のみ取得（プロット含む最初の数段落）
        // explaintext=1: プレーンテキストで取得
        // exsentences=10: 最初の10文を取得（summaryより長い）
        const extractUrl = `https://en.wikipedia.org/w/api.php?` +
          `action=query&titles=${encodeURIComponent(pageTitle)}&` +
          `prop=extracts&exintro=1&explaintext=1&exsentences=10&` +
          `format=json&origin=*`;

        const extractResponse = await fetch(extractUrl, {
          headers: {
            'User-Agent': 'MovieTimeline/1.0 (Educational Project)',
          },
        });

        if (!extractResponse.ok) {
          logger.debug(`Failed to fetch extract for "${pageTitle}": ${extractResponse.status}`);
          continue;
        }

        const extractData = await extractResponse.json();
        const pages = extractData.query?.pages;

        if (!pages) {
          logger.debug(`No pages found for "${pageTitle}"`);
          continue;
        }

        const pageId = Object.keys(pages)[0];
        const extract = pages[pageId]?.extract || '';

        if (!extract) {
          logger.debug(`No extract found for "${pageTitle}"`);
          continue;
        }

        logger.debug(`📄 Analyzing Wikipedia extract for "${pageTitle}" (${extract.length} chars)...`);

        // 3. 概要テキストから時代設定を抽出
        const timePeriod = extractTimePeriodFromText(extract, movie.title);

        if (timePeriod) {
          logger.debug(`✅ Found time period: ${timePeriod.startYear}${timePeriod.endYear ? `-${timePeriod.endYear}` : ''}`);
          return {
            success: true,
            startYear: timePeriod.startYear,
            endYear: timePeriod.endYear,
            period: timePeriod.period,
            additionalYears: timePeriod.additionalYears,
            confidence: timePeriod.confidence,
            source: 'wikipedia',
          };
        }
      } catch (error) {
        logger.warn(`Failed to fetch summary for "${pageTitle}":`, error);
        continue;
      }
    }

    // 時代設定が見つからなかった
    logger.debug(`⚠️ No time period information found in Wikipedia for "${movie.title}"`);
    return {
      success: false,
      startYear: null,
      endYear: null,
      period: '時代不明',
      confidence: 'low',
      source: 'wikipedia_no_period',
      error: 'No time period information found in Wikipedia extract',
    };
  } catch (error) {
    logger.error('Wikipedia Lookup error:', error);
    return {
      success: false,
      startYear: null,
      endYear: null,
      period: '時代不明',
      confidence: 'low',
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// テキストから時代設定を抽出するヘルパー関数
function extractTimePeriodFromText(text: string, _movieTitle: string): {
  startYear: number;
  endYear: number | null;
  period: string;
  additionalYears?: number[];
  confidence: 'high' | 'medium' | 'low';
} | null {

  // パターン1: "set in YYYY" または "takes place in YYYY"
  const setInPattern = /(?:set in|takes place in|set during|taking place in|occurs in|happening in)\s+(\d{4})/gi;
  const setInMatch = setInPattern.exec(text);
  if (setInMatch) {
    const year = parseInt(setInMatch[1]);
    return {
      startYear: year,
      endYear: null,
      period: `${year}`,
      confidence: 'high',
    };
  }

  // パターン2: "set in the YYYYs" (例: "set in the 1920s")
  const decadePattern = /(?:set in|takes place in|set during)\s+the\s+(\d{4})s/gi;
  const decadeMatch = decadePattern.exec(text);
  if (decadeMatch) {
    const decade = parseInt(decadeMatch[1]);
    return {
      startYear: decade,
      endYear: decade + 9,
      period: `${decade}s`,
      confidence: 'high',
    };
  }

  // パターン3: "YYYY-YYYY" (年代範囲)
  const rangePattern = /(\d{4})[–\-](\d{4})/g;
  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1]);
    const endYear = parseInt(rangeMatch[2]);
    // 公開年の範囲は除外（撮影期間など）
    if (endYear - startYear <= 50) {
      return {
        startYear,
        endYear,
        period: `${startYear}-${endYear}`,
        confidence: 'medium',
      };
    }
  }

  // パターン4: 概要の最初の方に出てくる4桁の年（文脈を考慮）
  const contextPattern = /(?:in|during|circa|around|about)\s+(\d{4})/gi;
  const contextMatch = contextPattern.exec(text);
  if (contextMatch) {
    const year = parseInt(contextMatch[1]);
    // 現実的な映画の時代設定の範囲のみ
    if (year >= YEAR_RANGE.MIN_VALID_YEAR && year <= YEAR_RANGE.MAX_VALID_YEAR) {
      return {
        startYear: year,
        endYear: null,
        period: `${year}`,
        confidence: 'medium',
      };
    }
  }

  // パターン5: 世紀表現 (例: "19th century")
  const centuryPattern = /(\d{1,2})(?:st|nd|rd|th)\s+century/gi;
  const centuryMatch = centuryPattern.exec(text);
  if (centuryMatch) {
    const century = parseInt(centuryMatch[1]);
    const startYear = (century - 1) * CENTURY_OFFSETS.CENTURY_BASE;
    const midYear = startYear + CENTURY_OFFSETS.MID;
    return {
      startYear: midYear,
      endYear: null,
      period: `${century}th century`,
      confidence: 'low',
    };
  }

  // パターン6: 歴史的イベント・人物キーワードマッチング
  const textLower = text.toLowerCase();
  const periodKeywords: Record<string, number> = {
    // 古代・中世
    'roman empire': 100,
    'julius caesar': -44,
    'cleopatra': -30,
    'spartacus': -71,
    'pompeii': 79,
    'gladiator': 180,
    'king arthur': 500,
    'joan of arc': 1429,
    'genghis khan': 1220,
    'marco polo': 1275,
    'black death': 1348,
    'ottoman empire': 1500,

    // ルネサンス・宗教改革
    'leonardo da vinci': 1500,
    'michelangelo': 1504,
    'martin luther': 1517,
    'henry viii': 1535,
    'elizabeth i': 1580,
    'shakespeare': 1600,

    // 17-18世紀
    'thirty years war': 1635,
    'louis xiv': 1680,
    'versailles': 1680,
    'peter the great': 1700,
    'seven years war': 1757,
    'marie antoinette': 1785,
    'french revolution': 1789,
    'guillotine': 1793,
    'napoleon': 1805,
    'waterloo': 1815,

    // 19世紀
    'war of 1812': 1812,
    'queen victoria': 1850,
    'crimean war': 1854,
    'american civil war': 1863,
    // 'civil war': 1863, は削除（Marvel の Civil War などと誤マッチするため）
    'wild west': 1875,
    'old west': 1875,
    'frontier': 1875,
    'belle epoque': 1900,
    'belle époque': 1900,

    // 探検時代
    'columbus': 1492,
    'magellan': 1520,

    // アメリカ史
    'mayflower': 1620,
    'american revolution': 1776,
    'revolutionary war': 1776,
    'declaration of independence': 1776,
    'gettysburg': 1863,
    'abraham lincoln': 1863,
    'gold rush': 1849,
    'ok corral': 1881,
    'billy the kid': 1881,
    'jesse james': 1882,

    // 第一次世界大戦
    'verdun': 1916,
    'somme': 1916,
    'gallipoli': 1915,
    'armistice': 1918,
    'treaty of versailles': 1919,

    // 戦間期
    'al capone': 1930,
    'great depression': 1933,
    'wall street crash': 1929,
    'dust bowl': 1935,

    // 第二次世界大戦
    'hitler': 1940,
    'holocaust': 1942,
    'auschwitz': 1943,
    'anne frank': 1944,
    'dunkirk': 1940,
    'battle of britain': 1940,
    'stalingrad': 1942,
    'el alamein': 1942,
    'd-day': 1944,
    'normandy': 1944,
    'omaha beach': 1944,
    'battle of the bulge': 1944,
    'iwo jima': 1945,
    'okinawa': 1945,
    'pearl harbor': 1941,
    'midway': 1942,
    'hiroshima': 1945,
    'nagasaki': 1945,
    'atomic bomb': 1945,
    'v-e day': 1945,
    'v-j day': 1945,
    'churchill': 1940,
    'roosevelt': 1942,
    'eisenhower': 1944,
    'patton': 1944,
    'rommel': 1942,

    // 戦後・冷戦
    'berlin wall': 1970,
    'cuban missile crisis': 1962,
    'bay of pigs': 1961,
    'korean war': 1951,
    'vietnam war': 1968,
    'tet offensive': 1968,

    // 1950-60年代
    'elvis': 1956,
    'elvis presley': 1956,
    'martin luther king': 1963,
    'jfk': 1963,
    'kennedy': 1963,
    'kennedy assassination': 1963,
    'apollo 11': 1969,
    'moon landing': 1969,
    'neil armstrong': 1969,
    'woodstock': 1969,

    // 1970-80年代
    'watergate': 1974,
    'nixon': 1972,
    'oil crisis': 1973,

    // 1990年代以降
    'fall of berlin wall': 1989,
    'gulf war': 1991,
    '9/11': 2001,
    'september 11': 2001,
    'iraq war': 2005,
    'afghanistan war': 2005,
  };

  for (const [keyword, year] of Object.entries(periodKeywords)) {
    if (textLower.includes(keyword.toLowerCase())) {
      logger.debug(`📚 Found keyword "${keyword}" in Wikipedia extract → ${year}`);
      return {
        startYear: year,
        endYear: null,
        period: `${year}`,
        confidence: 'medium',
      };
    }
  }

  return null;
}

// 時代設定を検索してデータベースに保存
export async function lookupAndCacheTimePeriod(
  movie: TMDbMovieDetails
): Promise<MovieTimePeriodEntry | null> {
  try {
    // 既にデータベースにある場合はスキップ（ただし低信頼性またはreliabilityフィールドがない場合は再試行）
    if (movieTimePeriodDb.hasTimePeriod(movie.id)) {
      const cached = movieTimePeriodDb.getTimePeriod(movie.id);
      // reliabilityが'high'の場合のみキャッシュを使用
      if (cached && cached.reliability === 'high') {
        logger.debug(`✅ Using cached time period for "${movie.title}" (reliability: high)`);
        return cached;
      }
      // 低信頼性またはreliabilityフィールドなしのキャッシュは削除して再試行
      const reason = !cached?.reliability ? 'no reliability field' : 'low reliability';
      logger.debug(`🔄 Ignoring cache for "${movie.title}" (${reason}) - retrying lookup`);
      movieTimePeriodDb.removeTimePeriod(movie.id);
    }

    logger.debug(`🤖 Starting AI lookup for movie: ${movie.title}`);

    // 1. まず共有DBで検索（全ユーザーで共有、最も高速）
    logger.debug(`🗄️ Trying shared DB for "${movie.title}"...`);
    const sharedDbResult = await getTimePeriodFromSharedDb(movie.id);

    if (sharedDbResult) {
      logger.debug(`✅ Found in shared DB: ${sharedDbResult.period}`);

      const entry: MovieTimePeriodEntry = {
        tmdbId: sharedDbResult.tmdb_id,
        title: sharedDbResult.original_title || sharedDbResult.title,
        startYear: sharedDbResult.start_year || 0,
        endYear: sharedDbResult.end_year,
        period: sharedDbResult.period,
        source: 'shared_db',
        notes: sharedDbResult.notes || `Shared DB (${sharedDbResult.source})`,
        additionalYears: sharedDbResult.additional_years || undefined,
        reliability: sharedDbResult.reliability as 'verified' | 'high' | 'medium' | 'low',
      };

      // LocalStorageにもキャッシュ
      movieTimePeriodDb.addTimePeriod(entry);
      logger.debug(`✅ Cached shared DB result for "${movie.title}"`);

      return entry;
    }

    // 2. Wikipediaで検索（無料なので優先）
    logger.debug(`🤖 Trying Wikipedia for "${movie.title}"...`);
    const wikipediaResult = await lookupMovieTimePeriod(movie);
    logger.debug(`📊 Wikipedia result for "${movie.title}":`, {
      success: wikipediaResult.success,
      startYear: wikipediaResult.startYear,
      source: wikipediaResult.source,
      confidence: wikipediaResult.confidence
    });

    if (wikipediaResult.success && wikipediaResult.startYear !== null) {
      const reliability = determineReliability(wikipediaResult, movie);
      const entry: MovieTimePeriodEntry = {
        tmdbId: movie.id,
        title: movie.original_title,
        startYear: wikipediaResult.startYear,
        endYear: wikipediaResult.endYear,
        period: wikipediaResult.period,
        source: 'ai_lookup',
        notes: `AI lookup (${wikipediaResult.confidence} confidence) from ${wikipediaResult.source}`,
        additionalYears: wikipediaResult.additionalYears,
        reliability,
      };

      // LocalStorageに保存
      movieTimePeriodDb.addTimePeriod(entry);
      logger.debug(`✅ Cached time period for "${movie.title}": ${wikipediaResult.period} (reliability: ${reliability})`);

      // 共有DBにも保存（非同期、失敗してもエラーにしない）
      saveTimePeriodToSharedDb({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        startYear: wikipediaResult.startYear,
        endYear: wikipediaResult.endYear,
        period: wikipediaResult.period,
        source: wikipediaResult.source,
        notes: `AI lookup (${wikipediaResult.confidence} confidence) from ${wikipediaResult.source}`,
        additionalYears: wikipediaResult.additionalYears,
        reliability,
      }).catch(err => logger.error('Failed to save to shared DB:', err));

      return entry;
    }

    // 2. Wikipediaで見つからなかった場合、DeepSeek-V3で検索（高推論能力）
    logger.debug(`🤖 Wikipedia failed, trying DeepSeek-V3 for "${movie.title}"...`);
    const deepseekResult = await extractTimePeriodWithDeepSeek(movie);
    logger.debug(`📊 DeepSeek result for "${movie.title}":`, {
      success: deepseekResult.success,
      startYear: deepseekResult.startYear,
      source: deepseekResult.source,
      confidence: deepseekResult.confidence,
      error: deepseekResult.error
    });

    if (deepseekResult.success && (deepseekResult.startYear !== null || deepseekResult.period === 'NEAR_FUTURE')) {
      const reliability = determineReliability(deepseekResult, movie);
      const entry: MovieTimePeriodEntry = {
        tmdbId: movie.id,
        title: movie.original_title,
        startYear: deepseekResult.startYear || 0, // NEAR_FUTURE の場合は 0
        endYear: deepseekResult.endYear,
        period: deepseekResult.period === 'NEAR_FUTURE' ? '近未来' : deepseekResult.period,
        source: 'ai_lookup',
        notes: `AI lookup (${deepseekResult.confidence} confidence) from ${deepseekResult.source}`,
        additionalYears: deepseekResult.additionalYears,
        reliability,
      };

      // LocalStorageに保存
      movieTimePeriodDb.addTimePeriod(entry);
      logger.debug(`✅ Cached time period for "${movie.title}": ${deepseekResult.period} (reliability: ${reliability})`);

      // 共有DBにも保存（非同期、失敗してもエラーにしない）
      saveTimePeriodToSharedDb({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        startYear: deepseekResult.startYear,
        endYear: deepseekResult.endYear,
        period: deepseekResult.period === 'NEAR_FUTURE' ? '近未来' : deepseekResult.period,
        source: deepseekResult.source,
        notes: `AI lookup (${deepseekResult.confidence} confidence) from ${deepseekResult.source}`,
        additionalYears: deepseekResult.additionalYears,
        reliability,
      }).catch(err => logger.error('Failed to save to shared DB:', err));

      return entry;
    }

    // 3. DeepSeekで見つからなかった場合、Gemini Flashで検索
    logger.debug(`🤖 DeepSeek failed, trying Gemini Flash for "${movie.title}"...`);
    const geminiResult = await extractTimePeriodWithGemini(movie);
    logger.debug(`📊 Gemini result for "${movie.title}":`, {
      success: geminiResult.success,
      startYear: geminiResult.startYear,
      source: geminiResult.source,
      confidence: geminiResult.confidence,
      error: geminiResult.error
    });

    if (geminiResult.success && (geminiResult.startYear !== null || geminiResult.period === 'NEAR_FUTURE')) {
      const reliability = determineReliability(geminiResult, movie);
      const entry: MovieTimePeriodEntry = {
        tmdbId: movie.id,
        title: movie.original_title,
        startYear: geminiResult.startYear || 0, // NEAR_FUTURE の場合は 0
        endYear: geminiResult.endYear,
        period: geminiResult.period === 'NEAR_FUTURE' ? '近未来' : geminiResult.period,
        source: 'ai_lookup',
        notes: `AI lookup (${geminiResult.confidence} confidence) from ${geminiResult.source}`,
        additionalYears: geminiResult.additionalYears,
        reliability,
      };

      // LocalStorageに保存
      movieTimePeriodDb.addTimePeriod(entry);
      logger.debug(`✅ Cached time period for "${movie.title}": ${geminiResult.period} (reliability: ${reliability})`);

      // 共有DBにも保存（非同期、失敗してもエラーにしない）
      saveTimePeriodToSharedDb({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        startYear: geminiResult.startYear,
        endYear: geminiResult.endYear,
        period: geminiResult.period === 'NEAR_FUTURE' ? '近未来' : geminiResult.period,
        source: geminiResult.source,
        notes: `AI lookup (${geminiResult.confidence} confidence) from ${geminiResult.source}`,
        additionalYears: geminiResult.additionalYears,
        reliability,
      }).catch(err => logger.error('Failed to save to shared DB:', err));

      return entry;
    }

    // 4. Geminiがレート制限またはエラーの場合、Groqにフォールバック
    if (geminiResult.source === 'gemini_rate_limit' || geminiResult.source === 'gemini_error') {
      logger.debug(`🚀 Gemini failed, falling back to Groq for "${movie.title}"...`);
      const groqResult = await extractTimePeriodWithGroq(movie);
      logger.debug(`📊 Groq result for "${movie.title}":`, {
        success: groqResult.success,
        startYear: groqResult.startYear,
        source: groqResult.source,
        confidence: groqResult.confidence,
        error: groqResult.error
      });

      if (groqResult.success && (groqResult.startYear !== null || groqResult.period === 'NEAR_FUTURE')) {
        const reliability = determineReliability(groqResult, movie);
        const entry: MovieTimePeriodEntry = {
          tmdbId: movie.id,
          title: movie.original_title,
          startYear: groqResult.startYear || 0, // NEAR_FUTURE の場合は 0
          endYear: groqResult.endYear,
          period: groqResult.period === 'NEAR_FUTURE' ? '近未来' : groqResult.period,
          source: 'ai_lookup',
          notes: `AI lookup (${groqResult.confidence} confidence) from ${groqResult.source} (Gemini fallback)`,
          additionalYears: groqResult.additionalYears,
          reliability,
        };

        // LocalStorageに保存
        movieTimePeriodDb.addTimePeriod(entry);
        logger.debug(`✅ Cached time period for "${movie.title}": ${groqResult.period} (via Groq fallback, reliability: ${reliability})`);

        // 共有DBにも保存（非同期、失敗してもエラーにしない）
        saveTimePeriodToSharedDb({
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          startYear: groqResult.startYear,
          endYear: groqResult.endYear,
          period: groqResult.period === 'NEAR_FUTURE' ? '近未来' : groqResult.period,
          source: groqResult.source,
          notes: `AI lookup (${groqResult.confidence} confidence) from ${groqResult.source} (Gemini fallback)`,
          additionalYears: groqResult.additionalYears,
          reliability,
        }).catch(err => logger.error('Failed to save to shared DB:', err));

        return entry;
      }

      // Groqでも失敗した場合、低信頼性で「時代不明」をキャッシュ
      const failedReliability = determineReliability(groqResult, movie);
      logger.debug(`⚠️ No time period found for "${movie.title}" (Wikipedia, DeepSeek, Gemini, and Groq all failed) - caching with reliability: ${failedReliability}`);

      // 時代不明として低信頼性でキャッシュ（次回再試行可能）
      const failedEntry: MovieTimePeriodEntry = {
        tmdbId: movie.id,
        title: movie.original_title,
        startYear: 0, // 0 を使用して時代不明を表現
        endYear: null,
        period: '時代不明',
        source: 'ai_lookup',
        notes: `All lookup methods failed (${groqResult.source})`,
        reliability: failedReliability,
      };
      movieTimePeriodDb.addTimePeriod(failedEntry);
      return null;
    }

    logger.debug(`⚠️ No time period found for "${movie.title}" (Wikipedia, DeepSeek, and Gemini all failed)`);
    return null;
  } catch (error) {
    logger.error(`Error in lookupAndCacheTimePeriod for movie "${movie.title}":`, error);
    return null;
  }
}

// ユーザーが手動で時代設定を入力した場合にデータベースに保存
export function saveUserProvidedTimePeriod(
  movie: TMDbMovieDetails,
  startYear: number,
  endYear: number | null,
  period: string
): void {
  try {
    const entry: MovieTimePeriodEntry = {
      tmdbId: movie.id,
      title: movie.original_title,
      startYear,
      endYear,
      period,
      source: 'user_provided',
      notes: 'Manually provided by user',
    };

    // LocalStorageに保存
    movieTimePeriodDb.addTimePeriod(entry);
    logger.debug(`💾 Saved user-provided time period for "${movie.title}"`);

    // 共有DBにも保存（非同期、失敗してもエラーにしない）
    // ユーザー提供のデータは信頼性が高い
    saveTimePeriodToSharedDb({
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      startYear,
      endYear,
      period,
      source: 'user_provided',
      notes: 'Manually provided by user',
      reliability: 'verified', // ユーザー提供は最高信頼性
    }).catch(err => logger.error('Failed to save user input to shared DB:', err));
  } catch (error) {
    logger.error(`Error saving user-provided time period for "${movie.title}":`, error);
    throw error;
  }
}

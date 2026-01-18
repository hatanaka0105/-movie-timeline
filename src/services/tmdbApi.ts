// Feature flag: プロキシ経由でAPIを呼び出す（本番環境推奨）
const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === 'true';

// レガシー: 直接呼び出し用（フォールバック）
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
import { movieTimePeriodDb } from './movieTimePeriodDb';
import { logger } from '../utils/logger';

// TMDb APIを呼び出す（プロキシまたは直接）
async function fetchTMDb(endpoint: string, params: Record<string, string>) {
  if (USE_PROXY) {
    // プロキシ経由（APIキー不要）
    const queryParams = new URLSearchParams({
      endpoint,
      ...params
    });
    const response = await fetch(`/api/tmdb-proxy?${queryParams.toString()}`);
    return response;
  } else {
    // 直接呼び出し（開発環境フォールバック）
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      ...params
    });
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}?${queryParams.toString()}`);
    return response;
  }
}

export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
}

export interface TMDbMovieDetails extends TMDbMovie {
  genres: Array<{ id: number; name: string }>;
  runtime: number;
  tagline: string;
  overviewEn?: string; // 英語版のあらすじ（年代抽出の精度向上用）
}

export interface TMDbSearchResponse {
  page: number;
  results: TMDbMovie[];
  total_pages: number;
  total_results: number;
}

// ジャンルマッピング（TMDb ID -> 日本語名）
const GENRE_MAP: Record<number, string> = {
  28: 'アクション',
  12: 'アドベンチャー',
  16: 'アニメ',
  35: 'コメディ',
  80: '犯罪',
  99: 'ドキュメンタリー',
  18: 'ドラマ',
  10751: '家族',
  14: 'ファンタジー',
  36: '歴史',
  27: 'ホラー',
  10402: '音楽',
  9648: 'ミステリー',
  10749: 'ロマンス',
  878: 'SF',
  10770: 'テレビ映画',
  53: 'スリラー',
  10752: '戦争',
  37: '西部劇',
};

export async function searchMovies(query: string): Promise<TMDbMovie[]> {
  try {
    const allResults: TMDbMovie[] = [];
    const seenIds = new Set<number>();

    // 1. 元のクエリで検索
    const response1 = await fetchTMDb('search/movie', {
      query: query,
      language: 'ja-JP',
    });

    if (response1.ok) {
      const data1: TMDbSearchResponse = await response1.json();
      data1.results.forEach(movie => {
        if (!seenIds.has(movie.id)) {
          seenIds.add(movie.id);
          allResults.push(movie);
        }
      });
    }

    // 2. 正規化版（・や空白を削除）で検索
    const normalizedQuery = query.replace(/[・\s]/g, '');
    if (normalizedQuery !== query) {
      const response2 = await fetchTMDb('search/movie', {
        query: normalizedQuery,
        language: 'ja-JP',
      });

      if (response2.ok) {
        const data2: TMDbSearchResponse = await response2.json();
        data2.results.forEach(movie => {
          if (!seenIds.has(movie.id)) {
            seenIds.add(movie.id);
            allResults.push(movie);
          }
        });
      }
    }

    // 3. ・や空白がない6文字以上のカタカナの場合、複数の分割パターンで検索
    if (!query.includes('・') && !query.includes(' ') && /^[ァ-ヴー]{6,}$/.test(normalizedQuery)) {
      // 複数の分割位置を試行（2文字刻み、3文字刻み、4文字刻み）
      const splitPositions = [];

      // 長さに応じて適切な分割位置を選択
      const len = normalizedQuery.length;
      if (len >= 6) {
        // 2文字 + 残り (例: スター・ウォーズ)
        splitPositions.push(2);
      }
      if (len >= 7) {
        // 3文字 + 残り (例: スター・ウォーズ)
        splitPositions.push(3);
      }
      if (len >= 8) {
        // 4文字 + 残り
        splitPositions.push(4);
      }
      if (len >= 9) {
        // 中間位置
        splitPositions.push(Math.floor(len / 2));
      }

      for (const pos of splitPositions) {
        const withMiddleDot = normalizedQuery.slice(0, pos) + '・' + normalizedQuery.slice(pos);

        if (withMiddleDot !== query && !seenIds.has(-pos)) { // 重複検索を防ぐ
          const response3 = await fetchTMDb('search/movie', {
            query: withMiddleDot,
            language: 'ja-JP',
          });

          if (response3.ok) {
            const data3: TMDbSearchResponse = await response3.json();
            data3.results.forEach(movie => {
              if (!seenIds.has(movie.id)) {
                seenIds.add(movie.id);
                allResults.push(movie);
              }
            });
          }

          seenIds.add(-pos); // この分割位置で検索済みとマーク
        }
      }
    }

    return allResults;
  } catch (error) {
    logger.error('Error searching movies:', error);
    return [];
  }
}

export async function getMovieDetails(movieId: number): Promise<TMDbMovieDetails | null> {
  try {
    // 日本語版を取得
    const responseJa = await fetchTMDb(`movie/${movieId}`, { language: 'ja-JP' });

    if (!responseJa.ok) {
      throw new Error(`TMDb API error: ${responseJa.status} ${responseJa.statusText}`);
    }

    const dataJa: TMDbMovieDetails = await responseJa.json();

    // 英語版も取得（年代抽出の精度向上のため）
    try {
      const responseEn = await fetchTMDb(`movie/${movieId}`, { language: 'en-US' });

      if (responseEn.ok) {
        const dataEn: TMDbMovieDetails = await responseEn.json();
        // 英語版のoverviewを追加フィールドとして保存
        dataJa.overviewEn = dataEn.overview;
      } else {
        logger.warn(`Failed to fetch English details for movie ${movieId}: ${responseEn.status}`);
      }
    } catch (error) {
      // 英語版の取得に失敗しても日本語版は返す
      logger.warn(`Error fetching English details for movie ${movieId}:`, error);
    }

    return dataJa;
  } catch (error) {
    logger.error(`Error fetching movie details for ID ${movieId}:`, error);
    return null;
  }
}

export function getImageUrl(path: string | null): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE_URL}${path}`;
}

export function mapGenres(genreIds: number[]): string[] {
  return genreIds.map((id) => GENRE_MAP[id] || '不明').filter((g) => g !== '不明');
}

// 映画のあらすじや情報から時代設定を推定
export function extractTimePeriod(movie: TMDbMovieDetails): {
  startYear: number | null;
  endYear: number | null;
  period: string;
  isEstimated?: boolean;
  additionalYears?: number[];
  isPending?: boolean;
} {
  const title = movie.title.toLowerCase() + ' ' + movie.original_title.toLowerCase();
  const overview = movie.overview.toLowerCase();
  const overviewEn = (movie.overviewEn || '').toLowerCase();
  const text = title + ' ' + overview + ' ' + overviewEn;

  logger.debug(`🔍 Extracting time period for: ${movie.title}`);
  logger.debug(`🔍 Overview (JA): ${overview}`);
  logger.debug(`🔍 Overview (EN): ${overviewEn}`);

  // まずデータベースをチェック
  const dbEntry = movieTimePeriodDb.getTimePeriod(movie.id);
  if (dbEntry) {
    return {
      startYear: dbEntry.startYear,
      endYear: dbEntry.endYear,
      period: dbEntry.period,
      additionalYears: dbEntry.additionalYears,
    };
  }




  // 特殊な時代設定のチェック
  // 1. ファンタジー・架空世界パターン（より具体的なので先にチェック）
  const fantasyKeywords = [
    'middle-earth',
    'middle earth',
    'ミドルアース',
    '中つ国',
    'fictional',
    'fantasy world',
    'imaginary',
    'mythical',
    '架空',
    'ファンタジー世界',
  ];

  const genreIds = movie.genre_ids || [];
  const isFantasyGenre = genreIds.includes(14); // 14 = Fantasy genre

  // ロード・オブ・ザ・リングなどの明確なファンタジー作品を検出
  const explicitFantasyTitles = [
    'lord of the rings',
    'the hobbit',
    'ロード・オブ・ザ・リング',
    'ホビット',
  ];

  const isExplicitFantasy = explicitFantasyTitles.some(title => text.includes(title.toLowerCase()));

  // タイトルや概要にファンタジー関連のキーワードがある、またはファンタジージャンルの場合
  const hasFantasyKeyword = fantasyKeywords.some(keyword => text.includes(keyword.toLowerCase()));

  if (isExplicitFantasy || (isFantasyGenre && hasFantasyKeyword)) {
    return {
      startYear: null,
      endYear: null,
      period: '時代設定なし（ファンタジー）',
      isEstimated: false,
    };
  }

  // 2. 「はるか昔」パターン（スター・ウォーズなど）
  const longAgoPatterns = [
    /long.*ago/gi,
    /a long time ago/gi,
    /はるか昔/g,
    /遥か昔/g,
    /遠い昔/g,
  ];

  for (const pattern of longAgoPatterns) {
    if (pattern.test(text)) {
      return {
        startYear: null,
        endYear: null,
        period: 'はるか昔',
        isEstimated: false,
      };
    }
  }


  const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;

  // 年代の正規表現パターン（優先順位順）
  const yearPatterns = [
    // 超高優先度：文章の冒頭の年表現
    /^(\d{4})年[、,]/gm, // "1932年、" (冒頭の年)

    // 明示的な時代設定パターン（高優先度）
    /set in (\d{4})/gi, // "set in 1970"
    /takes place in (\d{4})/gi, // "takes place in 1912"
    /舞台は(\d{4})年/g, // "舞台は1912年"
    /(\d{4})年を舞台/g, // "1912年を舞台"

    // 年代範囲パターン
    /(\d{4})\s*-\s*(\d{4})/g, // "1940-1945"
    /from (\d{4}) to (\d{4})/gi, // "from 1940 to 1945"

    // タイムトラベルパターン
    /(?:back|sent|travel).*?to (\d{4})/gi, // "back in time to 1955", "sent to 1970"
    /(?:back|sent|travel).*?in (\d{4})/gi, // "travel back in 1955"

    // 年代表現パターン
    /(?:early|late|mid)\s+(\d{4})s/gi, // "late 1970s", "early 1980s"
    /(\d{4})年代/g, // "1970年代"
    /(\d{4})s/gi, // "1970s"

    // 単純な年パターン（最低優先度）
    /in (\d{4})/gi, // "in 1912"
    /(\d{4})年/g, // "1912年"
  ];

  const years: number[] = [];
  const foundYears: { year: number; context: string; priority: number }[] = [];

  // 世紀表現から年代を推定
  const centuryPatterns: Array<{ pattern: RegExp; getCentury: (match: RegExpMatchArray) => number }> = [
    // 日本語の世紀表現
    { pattern: /(\d{1,2})世紀/g, getCentury: (m) => parseInt(m[1]) },

    // 英語の世紀表現（序数）
    { pattern: /(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },

    // 英語の世紀表現（基数）
    { pattern: /century\s+(\d{1,2})/gi, getCentury: (m) => parseInt(m[1]) },

    // 世紀の前期・後期表現
    { pattern: /early\s+(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },
    { pattern: /late\s+(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },
    { pattern: /mid[- ](\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },

    // turn of the century
    { pattern: /turn\s+of\s+the\s+(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },

    // 世紀末
    { pattern: /(\d{1,2})世紀末/g, getCentury: (m) => parseInt(m[1]) },
    { pattern: /end\s+of\s+the\s+(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },

    // 世紀初頭
    { pattern: /(\d{1,2})世紀初頭/g, getCentury: (m) => parseInt(m[1]) },
    { pattern: /beginning\s+of\s+the\s+(\d{1,2})(?:st|nd|rd|th)\s+century/gi, getCentury: (m) => parseInt(m[1]) },
  ];

  // 世紀表現をチェック
  centuryPatterns.forEach(({ pattern, getCentury }) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const century = getCentury(match);
      if (century >= 1 && century <= 21) {
        // 世紀の中間年を使用（例：19世紀 = 1850年）
        let year = (century - 1) * 100 + 50;

        // early/late/midの判定
        const matchText = match[0].toLowerCase();
        if (matchText.includes('early') || matchText.includes('初頭') || matchText.includes('beginning')) {
          year = (century - 1) * 100 + 20; // 世紀初頭は+20年
        } else if (matchText.includes('late') || matchText.includes('末') || matchText.includes('end')) {
          year = (century - 1) * 100 + 80; // 世紀末は+80年
        } else if (matchText.includes('mid') || matchText.includes('中')) {
          year = (century - 1) * 100 + 50; // 世紀中頃は+50年
        } else if (matchText.includes('turn')) {
          year = century * 100; // turn of the centuryは次の世紀の開始年
        }

        foundYears.push({
          year: year,
          context: match[0],
          priority: 3, // 世紀表現は中程度の優先度
        });
      }
    }
  });


  // 年を抽出（コンテキスト付き）
  yearPatterns.forEach((pattern, patternIndex) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const year1 = parseInt(match[1]);
      // リリース年と一致する年は除外（公開年の可能性が高い）
      if (year1 >= 1800 && year1 <= 2200 && year1 !== releaseYear) {
        foundYears.push({
          year: year1,
          context: match[0],
          priority: patternIndex,
        });
      }
      if (match[2]) {
        const year2 = parseInt(match[2]);
        if (year2 >= 1800 && year2 <= 2200 && year2 !== releaseYear) {
          foundYears.push({
            year: year2,
            context: match[0],
            priority: patternIndex,
          });
        }
      }
    }
  });

  // 高優先度の年を選択
  if (foundYears.length > 0) {
    logger.debug(`🔍 Found ${foundYears.length} years:`, foundYears.map(f => `${f.year} (${f.context})`));
    // 最も優先度の高いパターンの年を使用
    const highestPriority = Math.min(...foundYears.map(f => f.priority));
    const bestYears = foundYears
      .filter(f => f.priority === highestPriority)
      .map(f => f.year);
    years.push(...bestYears);
    logger.debug(`🔍 Selected years with highest priority:`, bestYears);
  }

  // 特定のキーワードから推定（歴史的イベント・戦争・時代）
  // 基準: 特定の歴史的イベント、人物、場所のみ。一般的な時代区分や職業は除外。
  const periodKeywords: Record<string, number> = {
    // 古代文明 - 特定の人物・イベントのみ
    'cleopatra': -30,
    'julius caesar': -44,
    'alexander the great': -323,
    'spartacus': -71,
    'pompeii': 79,  // ポンペイの火山噴火（特定イベント）

    // 中世 - 特定の人物・イベントのみ
    'joan of arc': 1429,
    'ジャンヌ・ダルク': 1429,
    'black death': 1348,  // 黒死病（ペスト大流行）
    'magna carta': 1215,  // マグナ・カルタ調印

    // ルネサンス - 特定の人物のみ
    'leonardo da vinci': 1500,
    'michelangelo': 1504,
    'galileo': 1610,

    // 日本の時代区分（これらは具体的な時代を指す）
    '戦国時代': 1550,
    '江戸時代': 1700,
    '明治時代': 1890,
    '大正時代': 1920,
    '昭和時代': 1950,
    '平成': 2000,
    '本能寺': 1582,  // 本能寺の変
    '関ヶ原': 1600,  // 関ヶ原の戦い
    'sekigahara': 1600,
    '幕末': 1865,
    'bakumatsu': 1865,
    '明治維新': 1868,
    'meiji restoration': 1868,

    // ヨーロッパの時代区分（具体的な王朝時代）
    'elizabethan': 1580,  // エリザベス朝
    'victorian era': 1860,
    'victorian': 1860,
    'ヴィクトリア朝': 1860,
    'regency era': 1815,
    'georgian era': 1750,
    'belle epoque': 1900,
    'belle époque': 1900,

    // 探検時代 - 特定の人物・イベントのみ
    'columbus': 1492,  // コロンブスの新大陸発見
    'コロンブス': 1492,
    'magellan': 1520,  // マゼランの世界周航

    // アメリカ史 - 特定のイベント・人物・場所のみ
    'mayflower': 1620,  // メイフラワー号
    'american revolution': 1776,
    'revolutionary war': 1776,
    'declaration of independence': 1776,
    'アメリカ独立': 1776,
    'gettysburg': 1863,  // ゲティスバーグの戦い
    'ゲティスバーグ': 1863,
    'abraham lincoln': 1863,
    'リンカーン': 1863,
    'gold rush': 1849,  // ゴールドラッシュ
    'ok corral': 1881,  // OK牧場の決闘
    'billy the kid': 1881,
    'jesse james': 1882,
    'american civil war': 1863,  // War/History ジャンルのみ
    '南北戦争': 1863,  // War/History ジャンルのみ

    // 第一次世界大戦 - 特定の戦闘・条約のみ
    'verdun': 1916,
    'somme': 1916,
    'gallipoli': 1915,
    'ガリポリ': 1915,
    'armistice': 1918,
    'treaty of versailles': 1919,
    'ヴェルサイユ条約': 1919,
    // 削除: 'great war', 'trench warfare' (too generic)

    // 戦間期 - 特定の人物・イベントのみ
    'al capone': 1930,
    'アル・カポネ': 1930,
    'great depression': 1933,
    '大恐慌': 1933,
    'wall street crash': 1929,
    'dust bowl': 1935,
    // 削除: 'roaring twenties', 'jazz age', 'prohibition', 'speakeasy' (too generic cultural terms)

    // 第二次世界大戦 - 特定の人物・戦闘・イベントのみ
    'hitler': 1940,
    'ヒトラー': 1940,
    'holocaust': 1942,
    'ホロコースト': 1942,
    'auschwitz': 1943,
    'アウシュヴィッツ': 1943,
    'anne frank': 1944,
    'アンネ・フランク': 1944,
    'dunkirk': 1940,
    'ダンケルク': 1940,
    'battle of britain': 1940,
    'stalingrad': 1942,
    'スターリングラード': 1942,
    'el alamein': 1942,
    'd-day': 1944,
    'ノルマンディ': 1944,
    'normandy': 1944,
    'オマハ・ビーチ': 1944,
    'omaha beach': 1944,
    'battle of the bulge': 1944,
    'バルジの戦い': 1944,
    'iwo jima': 1945,
    '硫黄島': 1945,
    'okinawa': 1945,
    '沖縄戦': 1945,
    'pearl harbor': 1941,
    '真珠湾': 1941,
    'パールハーバー': 1941,
    'midway': 1942,
    'ミッドウェー': 1942,
    'hiroshima': 1945,
    '広島': 1945,
    'nagasaki': 1945,
    '長崎': 1945,
    'atomic bomb': 1945,
    '原爆': 1945,
    'v-e day': 1945,
    'v-j day': 1945,
    'churchill': 1940,
    'チャーチル': 1940,
    'roosevelt': 1942,
    'ルーズベルト': 1942,
    'eisenhower': 1944,
    'patton': 1944,
    'パットン': 1944,
    'rommel': 1942,
    'ロンメル': 1942,
    // 削除: 'nazi', 'ナチス', 'blitz', 'blitzkrieg' (too generic terms)

    // 戦後・冷戦 - 特定のイベント・戦争のみ
    'berlin wall': 1970,
    'ベルリンの壁': 1970,
    'cuban missile crisis': 1962,
    'キューバ危機': 1962,
    'bay of pigs': 1961,
    'korean war': 1951,
    '朝鮮戦争': 1951,
    'vietnam war': 1968,
    'ベトナム戦争': 1968,
    'tet offensive': 1968,
    // 削除: 'post-war', '戦後', 'cold war', '冷戦', 'iron curtain', '鉄のカーテン', 'saigon', 'サイゴン' (too generic)

    // 1950-60年代 - 特定の人物・イベントのみ
    'elvis': 1956,
    'elvis presley': 1956,
    'beatles': 1964,
    'ビートルズ': 1964,
    'martin luther king': 1963,
    'キング牧師': 1963,
    'jfk': 1963,
    'kennedy': 1963,
    'ケネディ': 1963,
    'kennedy assassination': 1963,
    'apollo 11': 1969,
    'アポロ11号': 1969,
    'moon landing': 1969,
    '月面着陸': 1969,
    'neil armstrong': 1969,
    'woodstock': 1969,
    'ウッドストック': 1969,
    // 削除: 'rock and roll', 'ロックンロール', 'elvis', 'beatles', 'ビートルズ', 'civil rights', '公民権運動',
    // 'hippie', 'ヒッピー', 'counterculture' (too generic cultural terms)

    // 1970-80年代 - 特定の人物・イベントのみ
    'watergate': 1974,
    'ウォーターゲート': 1974,
    'nixon': 1972,
    'ニクソン': 1972,
    'oil crisis': 1973,
    '石油危機': 1973,
    // 削除: 'disco', 'ディスコ', 'punk rock', 'パンク' (too generic cultural terms)

    // 1990年代以降 - 特定のイベント・戦争のみ
    'fall of berlin wall': 1989,
    'ベルリンの壁崩壊': 1989,
    'gulf war': 1991,
    '湾岸戦争': 1991,
    '9/11': 2001,
    'september 11': 2001,
    '同時多発テロ': 2001,
    'iraq war': 2005,
    'イラク戦争': 2005,
    'afghanistan war': 2005,
    'アフガニスタン戦争': 2005,
    // 削除: 'war on terror' (too generic), 'afghanistan', 'アフガニスタン' (too generic - use 'afghanistan war' instead)

    // 災害・事件
    'titanic': 1912,
    'タイタニック号': 1912,
    'san francisco earthquake': 1906,
    'サンフランシスコ地震': 1906,
    'great kanto earthquake': 1923,
    '関東大震災': 1923,
    'chernobyl': 1986,
    'チェルノブイリ': 1986,

    // 追加の歴史的人物・イベント
    'napoleon': 1805,
    'ナポレオン': 1805,
    'waterloo': 1815,
    'ワーテルロー': 1815,
    'french revolution': 1789,
    'フランス革命': 1789,
    'marie antoinette': 1789,
    'マリー・アントワネット': 1789,
    'bastille': 1789,
    'バスティーユ': 1789,
    'reign of terror': 1793,
    '恐怖政治': 1793,
    'spanish inquisition': 1480,
    'スペイン異端審問': 1480,
    'ottoman empire': 1600,
    'オスマン帝国': 1600,
    'qing dynasty': 1750,
    '清朝': 1750,
    'ming dynasty': 1500,
    '明朝': 1500,
    'shogunate': 1700,
    // '将軍': 1700, // 削除: too generic (現代映画でも「将軍」という言葉が使われる）
    'tokugawa': 1700,
    '徳川': 1700,

    // 産業革命 - 特定のイベント・発明のみ（大部分を削除）
    'industrial revolution': 1820,
    '産業革命': 1820,
    // 削除: 'steam engine', '蒸気機関', 'factory', '工場', 'railroad', '鉄道' (too generic)

    // アメリカ開拓時代 - 特定のイベントのみ
    'oregon trail': 1850,
    'オレゴン街道': 1850,
    'california gold rush': 1849,
    'ゴールドラッシュ': 1849,
    // 削除: 'homestead', 'ホームステッド', 'pioneer', '開拓者', 'california gold', 'カリフォルニア', 'forty-niner' (too generic)

    // 奴隷制・人権 - 特定の人物・イベントのみ
    'underground railroad': 1850,
    '地下鉄道': 1850,
    'harriet tubman': 1850,
    'ハリエット・タブマン': 1850,
    'frederick douglass': 1850,
    'フレデリック・ダグラス': 1850,
    'emancipation proclamation': 1863,
    '奴隷解放宣言': 1863,
    // 削除: '奴隷', 'slave', 'emancipation', '奴隷解放', 'abolitionist', '奴隷廃止' (too generic)

    // 第一次世界大戦追加 - 特定の人物・兵器のみ
    'red baron': 1917,
    'レッド・バロン': 1917,
    // 削除: 'zeppelin', 'ツェッペリン', 'u-boat', 'uボート' (too generic vehicle types)

    // 戦間期追加 - 特定の人物・革命のみ
    'weimar republic': 1925,
    'ワイマール共和国': 1925,
    'russian revolution': 1917,
    'ロシア革命': 1917,
    'lenin': 1920,
    'レーニン': 1920,
    'stalin': 1935,
    'スターリン': 1935,
    // 削除: 'weimar', 'ワイマール', 'tsar', 'ツァーリ', 'bolshevik', 'ボリシェヴィキ', 'communism', '共産主義' (too generic)

    // 第二次世界大戦追加 - 特定の場所・人物のみ
    'gestapo': 1940,
    'ゲシュタポ': 1940,
    'vichy france': 1942,
    'ヴィシー政権': 1942,
    'de gaulle': 1944,
    'ドゴール': 1944,
    'anzio': 1944,
    'アンツィオ': 1944,
    'monte cassino': 1944,
    'モンテ・カッシーノ': 1944,
    // 削除: 'resistance', 'レジスタンス', 'partisan', 'パルチザン', 'occupied france', '占領', 'vichy', 'ヴィシー' (too generic)

    // 冷戦追加 - 特定の人物・イベントのみ
    'mccarthy': 1953,
    'マッカーシー': 1953,
    'sputnik': 1957,
    'スプートニク': 1957,
    'yuri gagarin': 1961,
    'ガガーリン': 1961,
    // 削除: 'red scare', 'レッドパージ', 'space race', '宇宙開発競争' (too generic)

    // 1960年代追加 - 特定のイベントのみ
    'summer of love': 1967,
    'サマー・オブ・ラブ': 1967,
    'paris 68': 1968,
    'パリ68年': 1968,
    'may 1968': 1968,
    '五月革命': 1968,
    // 削除: 'vietnam protest', '反戦運動', '学生運動', 'student protest' (too generic)

    // 1970-80年代追加 - 特定の人物・革命のみ
    'iranian revolution': 1979,
    'イラン革命': 1979,
    'khomeini': 1979,
    'ホメイニ': 1979,
    'reagan': 1985,
    'レーガン': 1985,
    'thatcher': 1985,
    'サッチャー': 1985,
    'mandela': 1990,
    'マンデラ': 1990,
    'nelson mandela': 1990,
    // 削除: 'ayatollah', 'apartheid', 'アパルトヘイト' (too generic terms)

    // 日本現代史追加 - 特定のイベントのみ
    'バブル経済': 1989,
    'bubble economy': 1989,
    '安保闘争': 1960,
    '全共闘': 1968,
    // 削除: 'バブル' (too generic - use 'バブル経済' instead)

    // 音楽・文化史 - すべて削除（一般的な文化用語は許可されない）
    // 削除: 'swing era', 'スウィング', 'big band', 'ビッグバンド', 'bebop', 'ビバップ',
    // 'motown', 'モータウン', 'grunge', 'グランジ', 'new wave', 'ニューウェーブ' (all too generic cultural terms)

    // 時代区分（世紀） - すべて削除（曖昧な時代区分は許可されない）
    // 削除: '19th century', '18th century', etc. (too generic - use regex patterns for explicit year extraction instead)

    // 映画固有のキーワード - 特定の人物・文明のみ
    'mayan civilization': 1500,
    'マヤ文明': 1500,
    'aztec empire': 1500,
    'アステカ帝国': 1500,
    'george vi': 1936,
    'ジョージ6世': 1936,
    'edward viii': 1936,
    'エドワード8世': 1936,
    'great train robbery': 1855,
    'bin laden': 2011,
    'ビンラディン': 2011,
    'osama bin laden': 2011,
    'abbottabad': 2011,
    // 削除: 'maya', 'mayan', 'マヤ', 'mesoamerica', 'メソアメリカ', 'aztec', 'アステカ', 'king george',
    // 'stuttering', 'abdication', 'train robbery', 'osama', 'ウサマ', 'seal team',
    // 'jungle guerrilla', 'central american jungle special forces' (too generic)

    // 未来（これらのキーワードだけでは年代特定が不正確なので、削除またはWikipedia検索に委ねる）
    // '未来': 2100,
    // 'dystopian future': 2100,
    // 'post-apocalyptic': 2100,
    // 'cyberpunk': 2050,
    // 'space age': 2100,
  };

  // キーワードベースの年代推定は、明示的な年が見つからなかった場合のみ使用
  if (foundYears.length === 0) {
    logger.debug('🔍 No explicit years found, using keyword-based estimation');

    // ジャンルIDを取得
    const genreIds = movie.genres.map(g => g.id);
    const isWarOrHistory = genreIds.includes(10752) || genreIds.includes(36); // 10752=War, 36=History

    // マッチしたキーワードとその優先度を記録
    const matchedKeywords: Array<{ keyword: string; year: number; priority: number }> = [];

    // 優先度の定義：より具体的なキーワードほど高い優先度
    const getKeywordPriority = (keyword: string): number => {
      // 戦闘・場所の具体名（最高優先度）
      if (['iwo jima', '硫黄島', 'normandy', 'ノルマンディー', 'stalingrad', 'スターリングラード',
           'pearl harbor', '真珠湾', 'hiroshima', '広島', 'nagasaki', '長崎', 'midway', 'ミッドウェー',
           'okinawa', '沖縄戦', 'd-day', 'dunkirk', 'ダンケルク', 'verdun', 'somme', 'gallipoli', 'ガリポリ',
           'anzio', 'アンツィオ', 'monte cassino', 'モンテ・カッシーノ', 'el alamein',
           'battle of the bulge', 'バルジの戦い', 'omaha beach', 'オマハ・ビーチ'].some(k => k === keyword.toLowerCase())) {
        return 1;
      }
      // その他すべて（中優先度） - 一般的な戦争名は削除済み
      return 2;
    };

    Object.entries(periodKeywords).forEach(([keyword, year]) => {
      // "american civil war" と "南北戦争" は War/History ジャンルのみ
      if ((keyword === 'american civil war' || keyword === '南北戦争') && !isWarOrHistory) {
        return; // Marvel の Civil War などをスキップ
      }

      // 単語境界を考慮したマッチング（英数字キーワードの場合）
      const isAlphanumeric = /^[a-z0-9\s-]+$/i.test(keyword);
      let matched = false;

      if (isAlphanumeric) {
        // 英数字キーワードは単語境界でマッチング
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        matched = regex.test(text);
      } else {
        // 日本語などはそのまま部分一致
        matched = text.includes(keyword);
      }

      if (matched) {
        const priority = getKeywordPriority(keyword);
        matchedKeywords.push({ keyword, year, priority });
        logger.debug(`🔍 Keyword match: "${keyword}" → ${year} (priority: ${priority})`);
      }
    });

    // 最も高い優先度を取得
    if (matchedKeywords.length > 0) {
      const highestPriority = Math.min(...matchedKeywords.map(m => m.priority));
      // 最高優先度のキーワードのみを使用
      const selectedKeywords = matchedKeywords.filter(m => m.priority === highestPriority);
      years.push(...selectedKeywords.map(m => m.year));

      if (selectedKeywords.length < matchedKeywords.length) {
        logger.debug(`🔍 Using only highest priority keywords (priority ${highestPriority})`);
      }
    }
  } else {
    logger.debug('🔍 Explicit years found, skipping keyword-based estimation');
  }

  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // タイトルに年代が含まれている場合は、その年代を優先
    const titleYearMatch = title.match(/(\d{4})/);
    const titleYear = titleYearMatch ? parseInt(titleYearMatch[1]) : null;

    // タイムトラベルパターンの検出（複数の離れた年代がある場合）
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);
    let additionalYears: number[] | undefined = undefined;

    // タイトルに年代が含まれている場合は、タイムトラベル検出をスキップ
    // (例: Blade Runner 2049 は2049年が舞台であり、タイムトラベル映画ではない)
    if (!titleYear && uniqueYears.length >= 2) {
      // 最初の年と最後の年の差が20年以上ある場合、タイムトラベルとみなす
      const yearDiff = uniqueYears[uniqueYears.length - 1] - uniqueYears[0];
      if (yearDiff > 20) {
        // startYearを最も古い年、additionalYearsに他の年代を格納
        additionalYears = uniqueYears.slice(1);
      }
    }

    // タイトルに年代が含まれている場合は、その年代を使用
    const finalStartYear = titleYear && years.includes(titleYear) ? titleYear : minYear;

    return {
      startYear: finalStartYear,
      endYear: finalStartYear !== maxYear ? maxYear : null,
      period: formatPeriod(finalStartYear, finalStartYear !== maxYear ? maxYear : finalStartYear),
      additionalYears,
    };
  }

  // 時代設定が不明な場合、Wikipedia検索をトリガーするために isEstimated: true を返す
  // 公開年をフォールバックとして使用しない
  return {
    startYear: null,
    endYear: null,
    period: '時代不明',
    isEstimated: true, // Wikipedia検索をトリガー
  };
}

function formatPeriod(startYear: number, endYear: number): string {
  if (startYear === endYear) {
    return `${startYear}年`;
  }
  if (startYear < 0) {
    return `紀元前${Math.abs(startYear)}年頃`;
  }
  if (endYear && endYear !== startYear) {
    return `${startYear}年 - ${endYear}年`;
  }
  return `${startYear}年代`;
}

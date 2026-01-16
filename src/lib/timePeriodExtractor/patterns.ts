// 年代抽出のための正規表現パターン

import { CENTURY_OFFSETS } from '../../config/constants';

// 年代抽出パターン（優先順位順）
export const YEAR_PATTERNS = [
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

// 世紀表現パターン
export const CENTURY_PATTERNS: Array<{
  pattern: RegExp;
  getCentury: (match: RegExpMatchArray) => number;
}> = [
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

// 世紀から年代を計算
export function centuryToYear(century: number, matchText: string): number {
  const centuryStart = (century - 1) * CENTURY_OFFSETS.CENTURY_BASE;
  let year = centuryStart + CENTURY_OFFSETS.MID; // デフォルトは世紀の中間年

  const lowerMatch = matchText.toLowerCase();
  if (lowerMatch.includes('early') || lowerMatch.includes('初頭') || lowerMatch.includes('beginning')) {
    year = centuryStart + CENTURY_OFFSETS.EARLY; // 世紀初頭
  } else if (lowerMatch.includes('late') || lowerMatch.includes('末') || lowerMatch.includes('end')) {
    year = centuryStart + CENTURY_OFFSETS.LATE; // 世紀末
  } else if (lowerMatch.includes('mid') || lowerMatch.includes('中')) {
    year = centuryStart + CENTURY_OFFSETS.MID; // 世紀中頃
  } else if (lowerMatch.includes('turn')) {
    year = century * CENTURY_OFFSETS.CENTURY_BASE; // turn of the centuryは次の世紀の開始年
  }

  return year;
}

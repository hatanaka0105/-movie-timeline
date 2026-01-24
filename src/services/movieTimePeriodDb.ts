// 映画の時代設定データベース
// TMDbのデータだけでは時代設定を特定できない映画の情報を格納

import { logger } from '../utils/logger';

export interface MovieTimePeriodEntry {
  tmdbId: number;
  title: string;
  startYear: number;
  endYear: number | null;
  period: string;
  source: 'manual' | 'ai_lookup' | 'user_provided' | 'shared_db';
  notes?: string;
  additionalYears?: number[];
  reliability?: 'verified' | 'high' | 'medium' | 'low'; // キャッシュの信頼性（低は再試行可能）
}

// 静的データベース（事前登録された映画）
import staticDb from '../data/movieTimePeriods.json';

// 動的データベース（実行時に追加された映画）
// サーバーサイドキャッシュ + LocalStorageのハイブリッド
const STORAGE_KEY = 'movieTimePeriodCache';
const CACHE_VERSION_KEY = 'movieTimePeriodCacheVersion';
const CURRENT_CACHE_VERSION = 13; // v13: Force complete cache refresh after CSP fixes (Groq API now allowed)
const API_CACHE_URL = '/api/movie-cache';

class MovieTimePeriodDatabase {
  private dynamicDb: Record<string, MovieTimePeriodEntry> = {};
  private serverCacheLoaded = false;

  constructor() {
    this.loadFromStorage();
    this.loadFromServerCache();
  }

  // LocalStorageから読み込み
  private loadFromStorage() {
    try {
      // 開発モードでURLパラメータにclearCache=1がある場合、キャッシュをクリア
      if (import.meta.env.DEV) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('clearCache') === '1') {
          logger.log('🗑️ Clearing cache due to clearCache=1 URL parameter');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(CACHE_VERSION_KEY);
          // URLパラメータを削除してリロード
          urlParams.delete('clearCache');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
          return;
        }
      }

      const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      const version = storedVersion ? parseInt(storedVersion) : 0;

      // If cache version doesn't match, clear old cache
      if (version !== CURRENT_CACHE_VERSION) {
        logger.log(`🗑️ Cache version mismatch (${version} !== ${CURRENT_CACHE_VERSION}), clearing old cache`);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION.toString());
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.dynamicDb = JSON.parse(stored);
        logger.debug(`✅ Loaded ${Object.keys(this.dynamicDb).length} cached entries from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load movie time period cache:', error);
    }
  }

  // サーバーキャッシュから読み込み
  private async loadFromServerCache() {
    if (this.serverCacheLoaded) return;

    try {
      const response = await fetch(API_CACHE_URL);
      if (response.ok) {
        const serverCache = await response.json();
        // サーバーキャッシュとローカルキャッシュをマージ（ローカルを優先）
        this.dynamicDb = { ...serverCache, ...this.dynamicDb };
        this.serverCacheLoaded = true;
        logger.debug(`✅ Loaded ${Object.keys(serverCache).length} entries from server cache`);
      }
    } catch (error) {
      logger.warn('Failed to load server cache, using local cache only:', error);
    }
  }

  // LocalStorageに保存
  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dynamicDb));
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION.toString());
    } catch (error) {
      console.error('Failed to save movie time period cache:', error);
    }
  }

  // サーバーキャッシュに保存
  private async saveToServerCache(tmdbId: number, entry: MovieTimePeriodEntry) {
    try {
      await fetch(API_CACHE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: tmdbId.toString(),
          data: {
            startYear: entry.startYear,
            endYear: entry.endYear,
            period: entry.period,
            additionalYears: entry.additionalYears,
          },
        }),
      });
      logger.debug(`✅ Saved movie ${tmdbId} to server cache`);
    } catch (error) {
      logger.warn('Failed to save to server cache:', error);
    }
  }

  // 映画の時代設定を取得
  getTimePeriod(tmdbId: number): MovieTimePeriodEntry | null {
    const key = tmdbId.toString();

    // まず静的DBをチェック
    if (staticDb[key as keyof typeof staticDb]) {
      return staticDb[key as keyof typeof staticDb] as MovieTimePeriodEntry;
    }

    // 次に動的DBをチェック
    if (this.dynamicDb[key]) {
      return this.dynamicDb[key];
    }

    return null;
  }

  // 新しい映画の時代設定を追加
  addTimePeriod(entry: MovieTimePeriodEntry): void {
    const key = entry.tmdbId.toString();
    this.dynamicDb[key] = entry;
    this.saveToStorage();
    // サーバーキャッシュにも保存（非同期、失敗しても処理は継続）
    this.saveToServerCache(entry.tmdbId, entry);
  }

  // 映画が登録済みかチェック
  hasTimePeriod(tmdbId: number): boolean {
    return this.getTimePeriod(tmdbId) !== null;
  }

  // 特定の映画を削除（低信頼性キャッシュの再試行用）
  removeTimePeriod(tmdbId: number): void {
    const key = tmdbId.toString();
    delete this.dynamicDb[key];
    this.saveToStorage();
    logger.debug(`🗑️ Removed cached entry for movie ${tmdbId}`);
  }

  // 動的DBの全エントリを取得（デバッグ用）
  getAllDynamicEntries(): MovieTimePeriodEntry[] {
    return Object.values(this.dynamicDb);
  }

  // 動的DBをクリア
  clearDynamicDb(): void {
    this.dynamicDb = {};
    localStorage.removeItem(STORAGE_KEY);
  }
}

// シングルトンインスタンス
export const movieTimePeriodDb = new MovieTimePeriodDatabase();

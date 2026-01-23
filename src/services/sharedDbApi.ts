// Shared Database API - PostgreSQL経由で全ユーザーで時代設定データを共有
import { logger } from '../utils/logger';

export interface SharedTimePeriodData {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  start_year: number | null;
  end_year: number | null;
  period: string;
  source: string;
  notes: string | null;
  additional_years: number[] | null;
  reliability: string;
  created_at: string;
  updated_at: string;
  vote_count: number;
}

/**
 * 共有DBから映画の時代設定を取得
 */
export async function getTimePeriodFromSharedDb(tmdbId: number): Promise<SharedTimePeriodData | null> {
  try {
    logger.debug(`🗄️ Querying shared DB for tmdbId: ${tmdbId}...`);

    const response = await fetch(`/api/movie-time-period?tmdbId=${tmdbId}`);

    if (response.status === 404) {
      logger.debug(`🗄️ Not found in shared DB: ${tmdbId}`);
      return null;
    }

    if (!response.ok) {
      logger.error(`❌ Shared DB API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: SharedTimePeriodData = await response.json();
    logger.debug(`✅ Found in shared DB: ${data.title} (${data.period})`);

    return data;
  } catch (error) {
    logger.error('Error fetching from shared DB:', error);
    return null;
  }
}

/**
 * 共有DBに映画の時代設定を保存
 */
export async function saveTimePeriodToSharedDb(data: {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  startYear: number | null;
  endYear: number | null;
  period: string;
  source: string;
  notes?: string;
  additionalYears?: number[];
  reliability: string;
}): Promise<boolean> {
  try {
    logger.debug(`💾 Saving to shared DB: ${data.title} (${data.period})...`);

    const response = await fetch('/api/movie-time-period', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      logger.error(`❌ Failed to save to shared DB: ${response.status} ${response.statusText}`);
      return false;
    }

    logger.debug(`✅ Successfully saved to shared DB: ${data.title}`);
    return true;
  } catch (error) {
    logger.error('Error saving to shared DB:', error);
    return false;
  }
}

/**
 * 複数の映画の時代設定を一括取得
 */
export async function getTimePeriodsBatchFromSharedDb(
  tmdbIds: number[]
): Promise<Map<number, SharedTimePeriodData>> {
  if (tmdbIds.length === 0) {
    return new Map();
  }

  try {
    logger.debug(`🗄️ Batch querying shared DB for ${tmdbIds.length} movies...`);

    const idsParam = tmdbIds.join(',');
    const response = await fetch(`/api/movie-time-period?tmdbIds=${idsParam}`);

    if (!response.ok) {
      logger.error(`❌ Shared DB batch API error: ${response.status} ${response.statusText}`);
      return new Map();
    }

    const data: Record<number, SharedTimePeriodData> = await response.json();
    const map = new Map<number, SharedTimePeriodData>();

    Object.entries(data).forEach(([key, value]) => {
      map.set(parseInt(key, 10), value);
    });

    logger.debug(`✅ Found ${map.size} movies in shared DB`);
    return map;
  } catch (error) {
    logger.error('Error batch fetching from shared DB:', error);
    return new Map();
  }
}

import { sql } from '@vercel/postgres';

export interface MovieTimePeriodRow {
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
  created_at: Date;
  updated_at: Date;
  vote_count: number;
}

/**
 * TMDb IDで映画の時代設定を取得
 */
export async function getMovieTimePeriod(tmdbId: number): Promise<MovieTimePeriodRow | null> {
  try {
    const result = await sql`
      SELECT * FROM movie_time_periods
      WHERE tmdb_id = ${tmdbId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as MovieTimePeriodRow;
  } catch (error) {
    console.error('Error fetching movie time period:', error);
    return null;
  }
}

/**
 * 映画の時代設定を保存または更新
 */
export async function saveMovieTimePeriod(data: {
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
}): Promise<MovieTimePeriodRow | null> {
  try {
    // UPSERT: 存在すれば更新、なければ挿入
    const result = await sql`
      INSERT INTO movie_time_periods (
        tmdb_id,
        title,
        original_title,
        start_year,
        end_year,
        period,
        source,
        notes,
        additional_years,
        reliability,
        updated_at
      ) VALUES (
        ${data.tmdbId},
        ${data.title},
        ${data.originalTitle || null},
        ${data.startYear},
        ${data.endYear},
        ${data.period},
        ${data.source},
        ${data.notes || null},
        ${data.additionalYears ? JSON.stringify(data.additionalYears) : null},
        ${data.reliability},
        NOW()
      )
      ON CONFLICT (tmdb_id) DO UPDATE SET
        title = EXCLUDED.title,
        original_title = EXCLUDED.original_title,
        start_year = EXCLUDED.start_year,
        end_year = EXCLUDED.end_year,
        period = EXCLUDED.period,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        additional_years = EXCLUDED.additional_years,
        reliability = EXCLUDED.reliability,
        updated_at = NOW()
      RETURNING *
    `;

    return result.rows[0] as MovieTimePeriodRow;
  } catch (error) {
    console.error('Error saving movie time period:', error);
    return null;
  }
}

/**
 * 複数の映画の時代設定を一括取得
 */
export async function getMovieTimePeriodsBatch(tmdbIds: number[]): Promise<Map<number, MovieTimePeriodRow>> {
  if (tmdbIds.length === 0) {
    return new Map();
  }

  try {
    // IN句を使って配列を展開
    const placeholders = tmdbIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await sql.query(
      `SELECT * FROM movie_time_periods WHERE tmdb_id IN (${placeholders})`,
      tmdbIds
    );

    const map = new Map<number, MovieTimePeriodRow>();
    result.rows.forEach((row) => {
      map.set(row.tmdb_id as number, row as MovieTimePeriodRow);
    });

    return map;
  } catch (error) {
    console.error('Error fetching movie time periods batch:', error);
    return new Map();
  }
}

/**
 * データベース統計情報を取得
 */
export async function getMovieTimePeriodStats() {
  try {
    const result = await sql`
      SELECT * FROM movie_time_periods_stats
      LIMIT 1
    `;

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

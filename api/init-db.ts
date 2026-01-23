import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Database initialization endpoint (ONE-TIME USE ONLY)
 *
 * ⚠️ SECURITY WARNING: This endpoint should be deleted after initial setup
 * or protected with authentication in production.
 *
 * Usage: POST /api/init-db with body: { "secret": "your-secret-key" }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple secret protection (replace with strong secret in production)
  const INIT_SECRET = process.env.DB_INIT_SECRET || 'change-me-in-production';

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;

  if (secret !== INIT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Debug: Check which environment variables are available
  const envVars = {
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasPrismaUrl: !!process.env.PRISMA_DATABASE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };
  console.log('Available database env vars:', envVars);

  try {
    // Create movie_time_periods table
    // Use sql helper without explicit connection (auto-uses POSTGRES_URL in Vercel)
    await sql`
      CREATE TABLE IF NOT EXISTS movie_time_periods (
        id SERIAL PRIMARY KEY,
        tmdb_id INTEGER NOT NULL UNIQUE,
        title VARCHAR(500) NOT NULL,
        original_title VARCHAR(500),
        start_year INTEGER,
        end_year INTEGER,
        period VARCHAR(200) NOT NULL,
        source VARCHAR(50) NOT NULL,
        notes TEXT,
        additional_years INTEGER[],
        reliability VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        vote_count INTEGER DEFAULT 1,
        CONSTRAINT tmdb_id_unique UNIQUE (tmdb_id)
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_movie_time_periods_tmdb_id
      ON movie_time_periods(tmdb_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_movie_time_periods_start_year
      ON movie_time_periods(start_year)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_movie_time_periods_reliability
      ON movie_time_periods(reliability)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_movie_time_periods_updated_at
      ON movie_time_periods(updated_at)
    `;

    // Create stats view
    await sql`
      CREATE OR REPLACE VIEW movie_time_periods_stats AS
      SELECT
        COUNT(*) as total_movies,
        COUNT(CASE WHEN reliability = 'verified' THEN 1 END) as verified_count,
        COUNT(CASE WHEN reliability = 'high' THEN 1 END) as high_reliability_count,
        COUNT(CASE WHEN source = 'wikipedia' THEN 1 END) as wikipedia_count,
        COUNT(CASE WHEN source = 'ai_lookup' THEN 1 END) as ai_count,
        COUNT(CASE WHEN source = 'user_provided' THEN 1 END) as user_count,
        MIN(start_year) as earliest_year,
        MAX(start_year) as latest_year
      FROM movie_time_periods
    `;

    // Insert sample data
    await sql`
      INSERT INTO movie_time_periods (tmdb_id, title, original_title, start_year, end_year, period, source, notes, reliability)
      VALUES
        (603, 'マトリックス', 'The Matrix', 1999, NULL, '1999年', 'wikipedia', 'Contemporary setting', 'verified'),
        (13, 'フォレスト・ガンプ/一期一会', 'Forrest Gump', 1951, 1981, '1951年 - 1981年', 'wikipedia', 'Historical drama spanning 30 years', 'verified'),
        (155, 'ダークナイト', 'The Dark Knight', 2008, NULL, '2008年', 'ai_lookup', 'AI lookup (high confidence) from deepseek_v3', 'high')
      ON CONFLICT (tmdb_id) DO NOTHING
    `;

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables_created: ['movie_time_periods'],
      indexes_created: 4,
      views_created: ['movie_time_periods_stats'],
      sample_data_inserted: 3
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

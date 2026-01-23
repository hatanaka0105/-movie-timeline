// ローカルからデータベースを初期化するスクリプト
import { createClient } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.localを読み込み
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function initDatabase() {
  console.log('🔌 Connecting to database...');
  console.log('Environment variables available:', {
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasPrismaUrl: !!process.env.PRISMA_DATABASE_URL,
  });

  // Use createClient() with non-pooling connection for DDL operations
  const client = createClient({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
  } catch (connectError) {
    console.error('❌ Connection error:', connectError);
    process.exit(1);
  }

  try {
    console.log('📝 Creating movie_time_periods table...');
    await client.sql`
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
    console.log('✅ Table created');

    console.log('📝 Creating indexes...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_movie_time_periods_tmdb_id ON movie_time_periods(tmdb_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_movie_time_periods_start_year ON movie_time_periods(start_year)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_movie_time_periods_reliability ON movie_time_periods(reliability)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_movie_time_periods_updated_at ON movie_time_periods(updated_at)`;
    console.log('✅ Indexes created');

    console.log('📝 Creating stats view...');
    await client.sql`
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
    console.log('✅ View created');

    console.log('📝 Inserting sample data...');
    await client.sql`
      INSERT INTO movie_time_periods (tmdb_id, title, original_title, start_year, end_year, period, source, notes, reliability)
      VALUES
        (603, 'マトリックス', 'The Matrix', 1999, NULL, '1999年', 'wikipedia', 'Contemporary setting', 'verified'),
        (13, 'フォレスト・ガンプ/一期一会', 'Forrest Gump', 1951, 1981, '1951年 - 1981年', 'wikipedia', 'Historical drama spanning 30 years', 'verified'),
        (155, 'ダークナイト', 'The Dark Knight', 2008, NULL, '2008年', 'ai_lookup', 'AI lookup (high confidence) from deepseek_v3', 'high')
      ON CONFLICT (tmdb_id) DO NOTHING
    `;
    console.log('✅ Sample data inserted');

    console.log('\n🎉 Database initialization completed successfully!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

initDatabase();

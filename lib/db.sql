-- Movie Time Periods Shared Database
-- Vercel Postgres用のスキーマ定義

CREATE TABLE IF NOT EXISTS movie_time_periods (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  original_title VARCHAR(500),
  start_year INTEGER,
  end_year INTEGER,
  period VARCHAR(200) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'wikipedia', 'ai_lookup', 'user_provided', etc.
  notes TEXT,
  additional_years INTEGER[],
  reliability VARCHAR(20) NOT NULL, -- 'verified', 'high', 'medium', 'low'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  vote_count INTEGER DEFAULT 1, -- 信頼性投票（将来的な機能）

  -- インデックス
  CONSTRAINT tmdb_id_unique UNIQUE (tmdb_id)
);

-- tmdb_idでの高速検索用インデックス
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_tmdb_id ON movie_time_periods(tmdb_id);

-- 時代範囲での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_start_year ON movie_time_periods(start_year);

-- 信頼性での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_reliability ON movie_time_periods(reliability);

-- 更新日時でのソート用インデックス
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_updated_at ON movie_time_periods(updated_at);

-- 統計情報取得用のビュー
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
FROM movie_time_periods;

-- サンプルデータ（テスト用）
INSERT INTO movie_time_periods (tmdb_id, title, original_title, start_year, end_year, period, source, notes, reliability)
VALUES
  (603, 'マトリックス', 'The Matrix', 1999, NULL, '1999年', 'wikipedia', 'Contemporary setting', 'verified'),
  (13, 'フォレスト・ガンプ/一期一会', 'Forrest Gump', 1951, 1981, '1951年 - 1981年', 'wikipedia', 'Historical drama spanning 30 years', 'verified'),
  (155, 'ダークナイト', 'The Dark Knight', 2008, NULL, '2008年', 'ai_lookup', 'AI lookup (high confidence) from deepseek_v3', 'high')
ON CONFLICT (tmdb_id) DO NOTHING;

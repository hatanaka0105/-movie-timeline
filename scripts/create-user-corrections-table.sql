-- ユーザーからの時代設定修正申告テーブル
CREATE TABLE IF NOT EXISTS user_corrections (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,

  -- 現在のDB値
  current_start_year INTEGER,
  current_end_year INTEGER,
  current_period TEXT,
  current_reliability TEXT,

  -- ユーザーが提案する値
  suggested_start_year INTEGER,
  suggested_end_year INTEGER,
  suggested_period TEXT NOT NULL,

  -- 申告情報
  user_reason TEXT, -- ユーザーが記入した理由（任意）
  user_ip TEXT, -- IPアドレス（スパム対策）
  user_agent TEXT, -- ブラウザ情報

  -- ステータス
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_corrections_tmdb_id ON user_corrections(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_user_corrections_status ON user_corrections(status);
CREATE INDEX IF NOT EXISTS idx_user_corrections_created_at ON user_corrections(created_at DESC);

-- コメント
COMMENT ON TABLE user_corrections IS 'ユーザーからの時代設定修正申告';
COMMENT ON COLUMN user_corrections.status IS '承認状態（pending: 保留中, approved: 承認済み, rejected: 却下）';
COMMENT ON COLUMN user_corrections.user_reason IS 'ユーザーが記入した修正理由';

-- 統計用ビュー（集約）
CREATE OR REPLACE VIEW user_corrections_summary AS
SELECT
  tmdb_id,
  title,
  suggested_period,
  COUNT(*) as correction_count,
  MAX(created_at) as latest_correction,
  array_agg(DISTINCT user_reason ORDER BY user_reason) FILTER (WHERE user_reason IS NOT NULL) as reasons
FROM user_corrections
WHERE status = 'pending'
GROUP BY tmdb_id, title, suggested_period
HAVING COUNT(*) >= 1
ORDER BY correction_count DESC, latest_correction DESC;

COMMENT ON VIEW user_corrections_summary IS '映画ごとの申告集約（同じ提案が複数ある場合に確認）';

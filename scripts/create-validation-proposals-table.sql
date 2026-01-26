-- validation_proposals テーブル作成スクリプト
-- 自動メンテナンス機能: LLMによる時代設定検証の提案を保存

CREATE TABLE IF NOT EXISTS validation_proposals (
  id SERIAL PRIMARY KEY,
  movie_time_period_id INTEGER REFERENCES movie_time_periods(id),
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,

  -- 現在のDB値
  current_start_year INTEGER,
  current_end_year INTEGER,
  current_period TEXT,
  current_additional_years INTEGER[],
  current_reliability TEXT,

  -- 提案する新しい値
  proposed_start_year INTEGER,
  proposed_end_year INTEGER,
  proposed_period TEXT,
  proposed_additional_years INTEGER[],
  proposed_reliability TEXT,

  -- 検証情報
  validation_source TEXT NOT NULL, -- 'deepseek_v3', 'gpt_4o', etc.
  validation_confidence FLOAT, -- 0.0 - 1.0
  validation_reasoning TEXT, -- LLMが提案した理由
  validation_evidence TEXT[], -- 根拠となるソース（Wikipedia URL等）

  -- ステータス管理
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_validation_proposals_status ON validation_proposals(status);
CREATE INDEX IF NOT EXISTS idx_validation_proposals_tmdb_id ON validation_proposals(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_validation_proposals_created_at ON validation_proposals(created_at DESC);

-- コメント追加
COMMENT ON TABLE validation_proposals IS '時代設定の検証提案を保存するテーブル（自動メンテナンス機能）';
COMMENT ON COLUMN validation_proposals.validation_source IS 'LLMの種類（deepseek_v3, gpt_4o等）';
COMMENT ON COLUMN validation_proposals.validation_confidence IS 'LLMの信頼度スコア（0.0-1.0）';
COMMENT ON COLUMN validation_proposals.status IS '承認状態（pending: 保留中, approved: 承認済み, rejected: 却下）';

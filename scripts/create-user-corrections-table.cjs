/**
 * user_correctionsテーブルを作成するスクリプト
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ POSTGRES_URL or DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createTable() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const createTableSQL = `
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
  user_reason TEXT,
  user_ip TEXT,
  user_agent TEXT,

  -- ステータス
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_corrections_tmdb_id ON user_corrections(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_user_corrections_status ON user_corrections(status);
CREATE INDEX IF NOT EXISTS idx_user_corrections_created_at ON user_corrections(created_at DESC);
`;

    await client.query(createTableSQL);
    console.log('✅ user_corrections table created successfully');

    // テーブルが正しく作成されたか確認
    const checkResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_corrections'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Table structure:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTable();

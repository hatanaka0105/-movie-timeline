# Shared Database Setup Guide

このガイドでは、映画の時代設定を全ユーザーで共有するためのPostgreSQLデータベースのセットアップ方法を説明します。

## 概要

MovieTimelineアプリは、映画の時代設定データを以下の優先順位で検索します：

1. **PostgreSQL共有DB** ← 全ユーザーで共有、最優先
2. LocalStorage（個人キャッシュ）
3. Wikipedia API
4. DeepSeek AI
5. Gemini Flash AI
6. Groq (Llama 3.3) AI

共有DBにより、同じ映画を検索した他のユーザーの結果を再利用でき、API呼び出しコストと時間を大幅に削減できます。

## Vercel Postgresのセットアップ

### 1. Vercel Postgresの有効化

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクト「movie-timeline-three」を選択
3. 「Storage」タブをクリック
4. 「Create Database」→「Postgres」を選択
5. データベース名: `movie-timeline-db`
6. リージョン: `US East (iad1)` （推奨）
7. 「Create」をクリック

### 2. 環境変数の自動設定

Vercel Postgresを作成すると、以下の環境変数が自動的に設定されます：

```
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

これらはVercelが自動的にサーバーレス関数に注入します。

### 3. データベーススキーマの作成

Vercel Dashboard → Storage → movie-timeline-db → Query で以下を実行：

```sql
-- lib/db.sql の内容をコピー&ペースト
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
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_tmdb_id ON movie_time_periods(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_start_year ON movie_time_periods(start_year);
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_reliability ON movie_time_periods(reliability);
CREATE INDEX IF NOT EXISTS idx_movie_time_periods_updated_at ON movie_time_periods(updated_at);

-- 統計ビュー作成
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
```

### 4. サンプルデータの挿入（オプション）

```sql
INSERT INTO movie_time_periods (tmdb_id, title, original_title, start_year, end_year, period, source, notes, reliability)
VALUES
  (603, 'マトリックス', 'The Matrix', 1999, NULL, '1999年', 'wikipedia', 'Contemporary setting', 'verified'),
  (13, 'フォレスト・ガンプ/一期一会', 'Forrest Gump', 1951, 1981, '1951年 - 1981年', 'wikipedia', 'Historical drama spanning 30 years', 'verified'),
  (155, 'ダークナイト', 'The Dark Knight', 2008, NULL, '2008年', 'ai_lookup', 'AI lookup (high confidence) from deepseek_v3', 'high')
ON CONFLICT (tmdb_id) DO NOTHING;
```

### 5. デプロイ

```bash
git add -A
git commit -m "feat: add shared PostgreSQL database for time periods"
git push
```

Vercelが自動的にデプロイし、環境変数を使ってPostgreSQLに接続します。

## ローカル開発環境での設定

ローカル開発でも共有DBを使用する場合：

1. Vercel Dashboard → Storage → movie-timeline-db → Settings → Connection
2. `.env.local`ファイルを作成し、環境変数をコピー：

```bash
# .env.local
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
# ... その他の変数
```

3. Vercel CLI経由で実行：

```bash
vercel dev
```

## API エンドポイント

### GET: 時代設定取得

単一取得：
```
GET /api/movie-time-period?tmdbId=603
```

一括取得：
```
GET /api/movie-time-period?tmdbIds=603,13,155
```

### POST: 時代設定保存

```
POST /api/movie-time-period
Content-Type: application/json

{
  "tmdbId": 603,
  "title": "マトリックス",
  "originalTitle": "The Matrix",
  "startYear": 1999,
  "endYear": null,
  "period": "1999年",
  "source": "wikipedia",
  "notes": "Contemporary setting",
  "reliability": "verified"
}
```

## データベーススキーマ

### movie_time_periods テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | SERIAL | 主キー |
| tmdb_id | INTEGER | TMDb映画ID（ユニーク） |
| title | VARCHAR(500) | 映画タイトル |
| original_title | VARCHAR(500) | オリジナルタイトル |
| start_year | INTEGER | 開始年 |
| end_year | INTEGER | 終了年（NULLable） |
| period | VARCHAR(200) | 時代設定（日本語） |
| source | VARCHAR(50) | データソース |
| notes | TEXT | メモ |
| additional_years | INTEGER[] | 追加年（タイムトラベル映画用） |
| reliability | VARCHAR(20) | 信頼性（verified/high/medium/low） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |
| vote_count | INTEGER | 投票数（将来の機能用） |

### データソース (source)

- `wikipedia`: Wikipedia APIから取得
- `ai_lookup`: AI (DeepSeek/Gemini/Groq) による推論
- `user_provided`: ユーザー手動入力
- `shared_db`: 共有DBから取得

### 信頼性レベル (reliability)

- `verified`: 検証済み（Wikipediaまたはユーザー提供）
- `high`: 高信頼性（AI高確信度）
- `medium`: 中信頼性
- `low`: 低信頼性（再試行可能）

## トラブルシューティング

### エラー: "POSTGRES_URL is not defined"

→ Vercel Dashboardで環境変数が設定されているか確認

### エラー: "relation 'movie_time_periods' does not exist"

→ スキーマが作成されていない。Vercel Dashboard → Query でSQLを実行

### ローカルで動作しない

→ `vercel dev`を使用するか、`.env.local`に環境変数を設定

## パフォーマンス

- **インデックス**: tmdb_id, start_year, reliability, updated_at
- **レート制限**: 500 req/hour（読み取り多め）
- **UPSERT**: 既存データは自動的に更新
- **キャッシング**: LocalStorageと併用で高速化

## セキュリティ

- CORS制限: 本番ドメインとlocalhostのみ許可
- レート制限: IPベース（Vercel KV使用）
- サーバーサイドのみ: APIキーは露出なし

## 統計情報

```sql
SELECT * FROM movie_time_periods_stats;
```

結果例：
```
total_movies: 1523
verified_count: 428
high_reliability_count: 892
wikipedia_count: 428
ai_count: 1095
user_count: 0
earliest_year: -10000
latest_year: 2300
```

## データのバックアップ

Vercel Postgres Proプランでは自動バックアップが提供されます。
Hobbyプランの場合は手動でエクスポート：

```sql
COPY movie_time_periods TO '/tmp/backup.csv' CSV HEADER;
```

## 今後の機能

- [ ] コミュニティ投票システム（vote_count活用）
- [ ] 信頼性の自動向上（複数ソースの一致）
- [ ] データ品質レポート
- [ ] 手動レビューワークフロー

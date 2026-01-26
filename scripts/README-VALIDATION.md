# 自動メンテナンス機能セットアップガイド

このドキュメントは、時代設定の自動検証機能（Phase 1: MVP）のセットアップ手順を説明します。

## Phase 1（MVP）の機能

1. **validation_proposalsテーブル**: LLMの検証結果を保存
2. **手動実行スクリプト**: 検証を手動でトリガー
3. **CLI承認インターフェース**: ターミナルで提案を確認・承認

## セットアップ手順

### 1. データベーステーブル作成

Neon PostgreSQLに`validation_proposals`テーブルを作成します。

**方法A: Neon Console（推奨）**

1. [Neon Console](https://console.neon.tech/) にログイン
2. プロジェクトを選択
3. SQL Editorを開く
4. `scripts/create-validation-proposals-table.sql` の内容をコピー&ペースト
5. "Run" をクリック

**方法B: psqlコマンドライン**

```bash
# Neon接続文字列を環境変数から取得（Vercelの設定を確認）
psql $DATABASE_URL -f scripts/create-validation-proposals-table.sql
```

**方法C: Node.jsスクリプト経由**

```bash
# まだ実装されていません（将来対応予定）
node scripts/setup-validation-table.js
```

### 2. 検証スクリプトの実行

手動で時代設定の検証を実行します。

```bash
# 最大10件の検証を実行（テスト用）
node scripts/validate-time-periods.cjs --limit 10

# 最大100件の検証を実行（本番用）
node scripts/validate-time-periods.cjs --limit 100

# 特定の信頼度のみ検証
node scripts/validate-time-periods.cjs --reliability low --limit 50
```

### 3. 検証結果の確認

スクリプト実行後、以下のコマンドで提案を確認できます。

```bash
# すべての保留中の提案を表示
node scripts/review-proposals.cjs

# 特定の提案の詳細を表示
node scripts/review-proposals.cjs --id 1

# 提案を承認
node scripts/review-proposals.cjs --approve 1

# 提案を却下
node scripts/review-proposals.cjs --reject 1
```

## データベーススキーマ

### validation_proposals テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | 主キー |
| movie_time_period_id | INTEGER | movie_time_periodsテーブルへの参照 |
| tmdb_id | INTEGER | TMDb映画ID |
| title | TEXT | 映画タイトル |
| current_start_year | INTEGER | 現在のDB値：開始年 |
| current_end_year | INTEGER | 現在のDB値：終了年 |
| current_period | TEXT | 現在のDB値：時代設定 |
| current_additional_years | INTEGER[] | 現在のDB値：追加年 |
| current_reliability | TEXT | 現在のDB値：信頼度 |
| proposed_start_year | INTEGER | 提案する開始年 |
| proposed_end_year | INTEGER | 提案する終了年 |
| proposed_period | TEXT | 提案する時代設定 |
| proposed_additional_years | INTEGER[] | 提案する追加年 |
| proposed_reliability | TEXT | 提案する信頼度 |
| validation_source | TEXT | LLMの種類（deepseek_v3等） |
| validation_confidence | FLOAT | 信頼度スコア（0.0-1.0） |
| validation_reasoning | TEXT | LLMの判断理由 |
| validation_evidence | TEXT[] | 根拠となるURL |
| status | TEXT | 承認状態（pending/approved/rejected） |
| reviewed_at | TIMESTAMP | 承認/却下日時 |
| reviewed_by | TEXT | 承認/却下したユーザー |
| created_at | TIMESTAMP | 作成日時 |

## SQL クエリ例

### すべての保留中の提案を取得

```sql
SELECT
  vp.id,
  vp.title,
  vp.current_period,
  vp.proposed_period,
  vp.validation_confidence,
  vp.created_at
FROM validation_proposals vp
WHERE vp.status = 'pending'
ORDER BY vp.validation_confidence DESC, vp.created_at DESC;
```

### 高信頼度（0.9+）の提案のみ取得

```sql
SELECT *
FROM validation_proposals
WHERE status = 'pending'
  AND validation_confidence >= 0.9
ORDER BY validation_confidence DESC;
```

### 提案を承認してDBに反映

```sql
BEGIN;

-- 1. movie_time_periodsを更新
UPDATE movie_time_periods
SET
  start_year = vp.proposed_start_year,
  end_year = vp.proposed_end_year,
  period = vp.proposed_period,
  additional_years = vp.proposed_additional_years,
  reliability = vp.proposed_reliability,
  source = vp.validation_source,
  updated_at = NOW()
FROM validation_proposals vp
WHERE movie_time_periods.id = vp.movie_time_period_id
  AND vp.id = $1; -- 提案ID

-- 2. 提案を承認済みに変更
UPDATE validation_proposals
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = 'admin'
WHERE id = $1;

COMMIT;
```

## トラブルシューティング

### テーブルが既に存在する場合

```sql
-- テーブルを削除して再作成
DROP TABLE IF EXISTS validation_proposals CASCADE;
-- その後、create-validation-proposals-table.sql を再実行
```

### 提案をすべてクリア

```sql
-- すべての提案を削除（注意：元に戻せません）
TRUNCATE TABLE validation_proposals;
```

## 次のステップ（Phase 2）

Phase 1が安定稼働したら、以下の機能を追加予定：

1. **Vercel Cron Jobs**: 月次自動実行
2. **メール通知**: 検証完了時に通知
3. **Web UI**: ブラウザで提案を確認・承認

詳細は `DEVELOPMENT.md` の「自動メンテナンス機能の設計」セクションを参照してください。

## Vercel Cron Jobs に関する技術的課題

現在、Vercel Cron Jobsの実装を試みましたが、以下の課題が発生しています：

### 問題点

1. **DEPLOYMENT_NOT_FOUND エラー**
   - `https://www.movietimeliner.com/api/validate-time-periods` にアクセスすると404エラー
   - 既存の `api/` フォルダ内のAPIエンドポイント（`movie-time-period.ts` など）も同様に404
   - これは、Vercelのデプロイメント設定に根本的な問題があることを示唆

2. **Vercel Cron Jobsの制限**
   - Vercel Cron Jobsは **Hobby（無料）プランでは利用不可**
   - Pro プラン（$20/月）以上が必要
   - 参考: https://vercel.com/docs/cron-jobs

3. **代替アプローチ**
   - 現時点では手動スクリプト（`scripts/validate-time-periods.cjs`）を使用
   - 月次で手動実行することで、Phase 1の機能は完全に動作

### 今後の対応方針

- **短期**: 手動スクリプトを継続使用（Phase 1として十分機能）
- **中期**: GitHub Actionsでの自動実行を検討（無料で利用可能）
- **長期**: Vercel Proプランへのアップグレードを検討

### GitHub Actions による代替実装案

```yaml
# .github/workflows/validate-time-periods.yml
name: Monthly Time Period Validation

on:
  schedule:
    - cron: '0 3 * * 0'  # 毎週日曜日 午前3時 UTC
  workflow_dispatch:  # 手動実行も可能

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node scripts/validate-time-periods.cjs --limit 100
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
          VITE_DEEPSEEK_API_KEY: ${{ secrets.VITE_DEEPSEEK_API_KEY }}
```

この方法なら、無料で月次自動実行が可能です。

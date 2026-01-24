# セッション引き継ぎドキュメント

**日付**: 2026-01-23
**プロジェクト**: MovieTimeline - 映画タイムラインビジュアライザー
**リポジトリ**: https://github.com/hatanaka0105/-movie-timeline.git
**本番URL**: https://movie-timeline-three.vercel.app/

## 前セッションで完了した作業

### 1. Neon Postgresデータベースのセットアップ
- Vercel StorageでNeon Postgres「movie-timeline-neon」を作成
- スキーマ初期化完了（`movie_time_periods`テーブル、インデックス4つ、統計ビュー）
- サンプルデータ3件挿入（The Matrix, Forrest Gump, The Dark Knight）
- 環境変数を`POSTGRES`プレフィックスで接続
- ローカル初期化スクリプト `scripts/init-db-local.js` 作成

**フォールバックチェーン**: 共有DB → LocalStorage → Wikipedia → DeepSeek → Gemini → Groq

### 2. Wikipedia API改善
**問題**: summary APIが短すぎて時代情報が含まれない
**解決**: Action API with `prop=extracts&exintro=1&exsentences=10`に変更
- 導入部+プロット含む最初の10文を取得
- "Seven Samurai" (1586年) などが検出可能に

**ファイル**: `src/services/aiTimePeriodLookup.ts` (132-173行目)

### 3. AI プロンプト改善
**問題**: TMDb overviewが不十分でLLMが推論できない
**解決**: プロンプトに4つの情報源を明示
1. タイトル分析（年号含むタイトル）
2. ジャンル推論（戦争→WWI/WWII、西部劇→1850-1900など）
3. LLMの映画知識（Caligula→AD 37-41など）
4. Overview キーワード抽出

**ファイル**:
- `src/services/deepseekApi.ts` (65-87行目)
- `src/services/geminiApi.ts` (35-57行目)
- `src/services/groqApi.ts` (32-54行目)

### 4. フォールバックチェーン修正
**問題**: Geminiが時代不明を返すとGroqにフォールバックせず終了
**解決**: `geminiResult.source === 'gemini_error'` から `!geminiResult.success || geminiResult.startYear === null` に変更

**ファイル**: `src/services/aiTimePeriodLookup.ts` (641-643行目)

**フォールバックチェーン確認**:
- TMDb → Wikipedia ✅ (`isEstimated: true`フラグで連携)
- Wikipedia → DeepSeek ✅
- DeepSeek → Gemini ✅
- Gemini → Groq ✅（修正済み）

### 5. レイアウト修正
**問題**: 画面幅が狭いと映画カードが下に移動
**解決**: 列数制限を削除し、無限に右に伸ばすように変更

**ファイル**: `src/utils/layoutCalculatorOptimized.ts` (161-173行目)
- `for (let col = 0; col < columns && !found; col++)` → `while (!found)`に変更
- 衝突時は同じY座標を保ったまま右に列を追加

### 6. キャッシュバージョンアップ
**ファイル**: `src/config/constants.ts` (35行目)
- `CURRENT_VERSION: 3` → `CURRENT_VERSION: 4`
- 旧LocalStorageキャッシュを無効化し、新しいNeon Postgresから取得

## 現在の状態

### デプロイ状況
- ✅ すべての変更がmainブランチにプッシュ済み
- ✅ Vercelで自動デプロイ完了（最新コミット: 6098720）
- ✅ データベース初期化完了、本番稼働中

### 技術スタック
- **フロントエンド**: React 19.2, TypeScript, Vite
- **バックエンド**: Vercel Serverless Functions
- **データベース**: Neon Postgres (Vercel Storage)
- **AI API**: DeepSeek-V3, Gemini 2.0 Flash, Groq Llama 3.3 70B
- **外部API**: TMDb API, Wikipedia API

### 環境変数（Vercel）
- `POSTGRES_URL` - プール接続
- `POSTGRES_URL_NON_POOLING` - 直接接続（DDL用）
- `VITE_TMDB_API_KEY` - TMDb API
- `VITE_DEEPSEEK_API_KEY` - DeepSeek API
- `VITE_GEMINI_API_KEY` - Gemini API
- `VITE_GROQ_API_KEY` - Groq API

## 既知の制約・設計方針

### 1. キーワード追加禁止
ユーザー要求: 個別作品やキーワードの追加はキリがないので避ける
→ 根本的な問題（API、プロンプト、フォールバックチェーン）を修正する方針

### 2. レイアウトポリシー
- 画面幅に関係なく横スクロールで対応
- 年代が重なる場合は下ではなく右に配置

### 3. フォールバックチェーン
- 各段階で「時代不明」と断定せず、次のフォールバックに降ろす
- 最終的に全AI失敗で初めて「時代不明」確定

## テスト用映画リスト

以下の映画で時代設定検出をテストすること:
- 7人の侍 (1586年)
- カリギュラ (AD 37-41)
- 陰陽師
- 忠臣蔵
- 十戒 (~1300 BC)
- エクソダス
- キングダム
- 恐竜100万年
- 紀元前1万年
- のぼうの城
- 華麗なるギャツビー
- プレステージ
- オデッセイ
- インデペンデンス・デイ
- フランケンシュタイン

## 重要なファイル一覧

### データベース関連
- `api/init-db.ts` - データベース初期化エンドポイント
- `api/movie-time-period.ts` - GET/POST API（共有DB操作）
- `lib/postgres.ts` - データベースアクセス関数
- `scripts/init-db-local.js` - ローカル初期化スクリプト
- `lib/db.sql` - スキーマ定義（手動実行用）

### 時代設定検出
- `src/services/tmdbApi.ts` - TMDb API、`extractTimePeriod`関数
- `src/services/aiTimePeriodLookup.ts` - Wikipedia検索、フォールバックチェーン制御
- `src/services/deepseekApi.ts` - DeepSeek-V3 API
- `src/services/geminiApi.ts` - Gemini 2.0 Flash API
- `src/services/groqApi.ts` - Groq Llama 3.3 70B API

### レイアウト
- `src/utils/layoutCalculator.ts` - 通常版レイアウト計算
- `src/utils/layoutCalculatorOptimized.ts` - 最適化版（Spatial Hashing、現在有効）
- `src/config/featureFlags.ts` - `useOptimizedLayout: true`

### UI
- `src/components/MovieSearch.tsx` - 映画検索、時代設定検出トリガー
- `src/components/Timeline.tsx` - タイムライン表示

## コミット履歴（最近の6件）

1. `6098720` - Fix fallback chain to continue on unknown period results
2. `1723051` - Improve AI prompts to use film knowledge when overview is insufficient
3. `7295124` - Fix Wikipedia time period extraction to use longer extracts
4. `e11f0cc` - fix: mark timelineWidth parameter as unused in layoutCalculatorOptimized
5. `1a5475d` - Fix layout: extend horizontally instead of vertically on narrow screens
6. `bf134e1` - Bump cache version to 4 for Neon Postgres migration

## 次のセッションで確認すべきこと

1. ✅ すべての修正が本番環境で正しく動作しているか
2. ✅ テスト用映画リストで時代設定が正しく検出されるか
3. ✅ 共有データベースが複数ユーザーで共有されているか
4. ⚠️ パフォーマンス（特にレイアウト計算）
5. ⚠️ エラーハンドリング、レート制限対応

## トラブルシューティング

### データベース接続エラー
- `POSTGRES_URL_NON_POOLING`を使用（DDL操作の場合）
- `POSTGRES_URL`を使用（SELECT/INSERT/UPDATE の場合）

### Wikipedia API エラー
- User-Agent必須: `MovieTimeline/1.0 (Educational Project)`
- Action API使用: `action=query&prop=extracts&exintro=1&exsentences=10`

### AI API レート制限
- DeepSeek → Gemini → Groq の順で自動フォールバック
- エラー時は`source`フィールドで識別（`deepseek_rate_limit`など）

### レイアウト問題
- `featureFlags.useOptimizedLayout`が`true`であることを確認
- `layoutCalculatorOptimized.ts`が使用される
- 列数制限なし、無限横スクロール

## 開発コマンド

```bash
# ローカル開発
npm run dev

# ビルド
npm run build

# Vercel デプロイ
git push origin main  # 自動デプロイ

# データベース初期化（ローカル）
node scripts/init-db-local.js

# 環境変数取得
vercel env pull .env.local

# Vercel CLIコマンド
vercel ls           # デプロイメント一覧
vercel logs         # ログ確認
```

## 連絡先・リソース

- **GitHub**: https://github.com/hatanaka0105/-movie-timeline
- **Vercel Dashboard**: https://vercel.com/ccccradles-projects/movie-timeline
- **Neon Dashboard**: Vercel Storage経由でアクセス
- **TMDb API Docs**: https://developers.themoviedb.org/3
- **Wikipedia API Docs**: https://www.mediawiki.org/wiki/API:Main_page

---

**最終更新**: 2026-01-23
**次回セッション開始時**: このドキュメントを読み、現在の状態を確認してから作業を開始すること

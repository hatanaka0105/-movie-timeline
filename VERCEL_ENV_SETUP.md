# Vercel Environment Variables Setup

## 概要

このアプリケーションはAPIキーを保護するためにサーバーサイドプロキシを使用しています。
本番環境で動作させるには、Vercelダッシュボードで以下の環境変数を設定する必要があります。

## 必要な環境変数

### 1. TMDB_API_KEY (必須)
- **説明**: The Movie Database (TMDb) APIキー
- **取得方法**: https://www.themoviedb.org/settings/api
- **値の例**: `23b4dfd5c1561702da9a1a1b3a7d2d25` (32文字の英数字)
- **重要**: `VITE_`プレフィックスは**付けません**（サーバーサイド専用）

### 2. GEMINI_API_KEY (必須)
- **説明**: Google Gemini API キー
- **取得方法**: https://aistudio.google.com/app/apikey
- **値の例**: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **重要**: `VITE_`プレフィックスは**付けません**（サーバーサイド専用）

### 3. ALLOWED_ORIGIN (オプション)
- **説明**: CORS許可オリジン（デフォルト: `https://movie-timeline-three.vercel.app`）
- **値の例**: `https://your-custom-domain.com`
- **注意**: カスタムドメインを使用する場合のみ設定

## Vercelでの設定手順

1. Vercelダッシュボードにアクセス
   - https://vercel.com/ccccradles-projects/movie-timeline

2. Settings → Environment Variables に移動

3. 以下の環境変数を追加:

```
TMDB_API_KEY
Value: [your_tmdb_api_key]
Environment: Production, Preview, Development
```

```
GEMINI_API_KEY
Value: [your_gemini_api_key]
Environment: Production, Preview, Development
```

4. Save をクリック

5. Redeploy
   - Deployments タブに移動
   - 最新のデプロイメントの「...」メニューをクリック
   - "Redeploy" を選択

## 検証方法

### 1. APIキーがバンドルに含まれていないことを確認

```bash
# ビルド後のdistフォルダを検索
npm run build
grep -r "23b4dfd5c1561702da9a1a1b3a7d2d25" dist/
# 期待結果: 何も見つからない
```

### 2. プロキシが動作していることを確認

```bash
# TMDbプロキシをテスト
curl "https://movie-timeline-three.vercel.app/api/tmdb-proxy?endpoint=search/movie&query=Inception&language=ja-JP"

# Geminiプロキシをテスト（POST）
curl -X POST "https://movie-timeline-three.vercel.app/api/gemini-proxy" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.0-flash-exp","action":"generateContent","contents":[{"parts":[{"text":"test"}]}]}'
```

### 3. CORSが正しく機能していることを確認

```bash
# 不正なオリジンからのリクエストをテスト
curl -H "Origin: https://malicious-site.com" \
  "https://movie-timeline-three.vercel.app/api/tmdb-proxy?endpoint=search/movie&query=test"
# 期待結果: CORS header should not include malicious-site.com
```

### 4. レート制限が動作していることを確認

```bash
# 同一IPから101回リクエスト
for i in {1..101}; do
  curl "https://movie-timeline-three.vercel.app/api/movie-cache"
done
# 期待結果: 101回目で429 Too Many Requests
```

## セキュリティチェックリスト

- [ ] `TMDB_API_KEY`と`GEMINI_API_KEY`がVercel環境変数に設定されている
- [ ] APIキーに`VITE_`プレフィックスが**付いていない**
- [ ] ビルドバンドルにAPIキーが含まれていない
- [ ] TMDbプロキシが正常に動作している
- [ ] Geminiプロキシが正常に動作している
- [ ] CORSが本番ドメインのみ許可している
- [ ] レート制限が動作している
- [ ] 本番環境で映画検索が動作している
- [ ] 本番環境でAI時代抽出が動作している

## トラブルシューティング

### プロキシが500エラーを返す
- Vercel環境変数が正しく設定されているか確認
- Vercelログを確認: `console.error('TMDB_API_KEY is not set')`

### プロキシが404エラーを返す
- `/api`フォルダがgitにコミットされているか確認
- `vercel.json`の設定を確認（特に`rewrites`）

### CORS エラーが発生する
- `ALLOWED_ORIGINS`配列にアクセス元のドメインが含まれているか確認
- プリフライトリクエスト（OPTIONS）が正しく処理されているか確認

### レート制限が動作しない
- Vercel KVが有効になっているか確認
- Vercel KVのコンソールでキー`rate_limit:*`を確認

## ローカル開発環境

ローカル開発では、引き続き`.env`ファイルの`VITE_`プレフィックス付き環境変数を使用できます:

```env
# .env (ローカル開発用)
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

本番環境ではプロキシ経由、開発環境では直接呼び出しの動作になります。

## 参考リンク

- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Vercel KV: https://vercel.com/docs/storage/vercel-kv
- TMDb API Documentation: https://developers.themoviedb.org/3
- Gemini API Documentation: https://ai.google.dev/docs

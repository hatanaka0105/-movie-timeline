# 🎬 MovieTimeline

映画の時代設定を視覚的に比較できるタイムラインツール。

🌐 **[デモを見る](https://movie-timeline-three.vercel.app/)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hatanaka0105/-movie-timeline)

## Features

- 🔍 **映画検索**: TMDb APIを使用した映画検索
- 📊 **比例的タイムライン**: 年代差が正確に反映される（1年 = 1cm）
- 📏 **定規表示**: 左側に年代マーカーを表示
- 🤖 **自動時代推定**: Gemini AIで映画の時代設定を自動抽出
- ✍️ **手動入力**: 手動でも映画情報を入力可能
- 🔒 **セキュア**: APIキーを公開せず、サーバーレスプロキシで保護
- ⚡ **高速**: Spatial Hashing による O(n) レイアウト計算

## Quick Start

### ローカルで実行

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集してAPIキーを設定

# 開発サーバー起動
npm run dev
```

詳細は [DEVELOPMENT.md](./DEVELOPMENT.md) を参照してください。

### Vercelへのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hatanaka0105/-movie-timeline)

デプロイ後の設定手順は [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) を参照してください。

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Build**: Vite
- **APIs**: TMDb API, DeepSeek-V3, Gemini Flash 2.0
- **Backend**: Vercel Serverless Functions + Vercel KV (Redis)
- **Security**: Zod, CSP, セキュリティヘッダー

## Documentation

- [開発ガイド](./DEVELOPMENT.md) - 開発者向け詳細情報
- [セキュリティ](./SECURITY.md) - セキュリティ対策の詳細
- [Vercel環境設定](./VERCEL_ENV_SETUP.md) - Vercelへのデプロイ手順

## Example Usage

1. **映画を検索**: "タイタニック" を検索
2. **自動抽出**: 時代設定が "1912年" と自動で設定される
3. **タイムライン表示**: 他の映画と年代差が正確に反映される

## How It Works

### 時代設定推定のフォールバック戦略

```
1. TMDb メタデータ → 2. Wikipedia API
   ↓                      ↓
3. DeepSeek-V3 → 4. Gemini Flash 2.0
   ↓                      ↓
5. Groq → 6. キーワード抽出
```

多段階のフォールバック戦略により、高い精度で時代設定を推定します。

### タイムラインレイアウト

- **比例的な配置**: 1年 = 10px（96dpiで約1cm）
- **Spatial Hashing**: O(n²) → O(n) に最適化
- **複数カラム**: 同じ年代の映画は横に並べて配置

## License

MIT

---

**開発者向け情報**: [DEVELOPMENT.md](./DEVELOPMENT.md) を参照してください。

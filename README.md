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
- 🧪 **自動テスト**: Puppeteerによる自動ブラウザテスト

## Setup

### 1. 依存関係のインストール

```bash
npm install
```

### 2. API キーの取得（開発環境のみ）

**本番環境では不要**: デプロイ済みアプリ (https://movie-timeline-three.vercel.app/) はサーバーレスプロキシを使用しており、ユーザー側でAPIキーを設定する必要はありません。

**ローカル開発時のみ**: 以下のAPIキーが必要です:

#### TMDb API キー
1. [TMDb](https://www.themoviedb.org/) にアカウント登録
2. [API設定ページ](https://www.themoviedb.org/settings/api) でAPIキーを取得

#### Gemini API キー
1. [Google AI Studio](https://makersuite.google.com/app/apikey) でAPIキーを取得

#### DeepSeek API キー (オプション、推奨)
1. [DeepSeek Platform](https://platform.deepseek.com/api_keys) でAPIキーを取得
2. 無料枠: 新規登録で500万トークン (30日間有効)

#### 環境変数設定
`.env` ファイルを作成:

```bash
cp .env.example .env
```

`.env` ファイルにAPIキーを設定:

```
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**注意**: `.env`ファイルは`.gitignore`に含まれており、Gitにコミットされません。

### 3. 開発サーバー起動

```bash
npm run dev
```

http://localhost:5173/ にアクセス

## Vercel へのデプロイ

### 1. Vercel KV データベースのセットアップ

レート制限機能にはVercel KV (Redis) を使用します。

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. 「Storage」タブをクリック
4. 「Create Database」→「KV」を選択
5. データベース名を入力（例：`movie-rate-limit-kv`）
6. 「Create」をクリック
7. 作成されたデータベースをプロジェクトに接続

これにより、必要な環境変数（`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`）が自動的に設定されます。

### 2. API キーの設定（サーバーサイド）

**重要**: APIキーは**サーバーサイド専用**として設定し、クライアントに公開しないでください。

Vercel Dashboard のプロジェクト設定で環境変数を追加：

1. 「Settings」→「Environment Variables」
2. 以下の環境変数を追加（`VITE_`プレフィックスは**付けない**）:
   - `TMDB_API_KEY`: TMDb APIキー (必須)
   - `DEEPSEEK_API_KEY`: DeepSeek APIキー (推奨 - 高推論能力)
   - `GEMINI_API_KEY`: Gemini APIキー (必須)
3. Environment: **Production**, **Preview**, **Development** すべてにチェック
4. 「Save」をクリック

**セキュリティ注意**:
- ❌ `VITE_TMDB_API_KEY` のような`VITE_`プレフィックスは使用しない（クライアントに公開されます）
- ✅ `TMDB_API_KEY` のようにプレフィックスなしで設定（サーバーサイドのみ）

詳細は [`VERCEL_ENV_SETUP.md`](./VERCEL_ENV_SETUP.md) を参照してください。

### 3. デプロイ

```bash
git push
```

Vercelが自動的にビルド・デプロイします。

## セキュリティ

このアプリケーションは以下のセキュリティ対策を実装しています:

### APIキー保護
- **サーバーレスプロキシ**: TMDb/DeepSeek/Gemini APIキーはサーバーサイドのみで使用
- **レート制限**: IPアドレスベースでAPI呼び出しを制限
  - TMDb: 200 requests/hour
  - DeepSeek: 50 requests/hour
  - Gemini: 50 requests/hour
- **CORS制限**: 許可されたオリジンからのみアクセス可能

### セキュリティヘッダー
- **CSP (Content Security Policy)**: XSS攻撃を防止
- **HSTS**: HTTPS接続を強制
- **X-Frame-Options**: クリックジャッキング対策
- **X-Content-Type-Options**: MIMEスニッフィング対策

詳細は [`SECURITY.md`](./SECURITY.md) を参照してください。

## アーキテクチャ

```
ユーザー → Vercel Edge (セキュリティヘッダー)
         → フロントエンド (React SPA)
         → APIプロキシ (/api/tmdb-proxy, /api/deepseek-proxy, /api/gemini-proxy)
            - レート制限 (Vercel KV)
            - CORS検証
            - 入力バリデーション (Zod)
         → 外部API (TMDb, DeepSeek, Gemini)
```

### 時代設定推定のフォールバック戦略

```
1. TMDb メタデータ (映画データベースの年代情報)
   ↓ 失敗
2. Wikipedia API (構造化された時代設定データ)
   ↓ 失敗
3. DeepSeek-V3 (高推論AI - o1レベルの分析)
   ↓ 失敗
4. Gemini Flash 2.0 (高速AI - コスト効率重視)
   ↓ 失敗
5. Groq (超高速AI - 緊急フォールバック)
   ↓ 失敗
6. キーワード抽出 (正規表現パターンマッチ)
```

**利点**:
- ✅ APIキーがクライアントに公開されない
- ✅ レート制限で悪用を防止
- ✅ CORS制限でクロスオリジン攻撃を防止
- ✅ セキュリティヘッダーで一般的な攻撃を防止

## Scripts

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 自動テスト実行
npm run test:auto

# ブラウザ監視モード（リアルタイムログ表示）
npm run monitor
```

## キャッシュのクリア方法 / How to Clear Cache

映画の時代設定データはlocalStorageにキャッシュされます。時代設定抽出ロジックを変更した場合、古いキャッシュをクリアする必要があります。

Movie time period data is cached in localStorage. When you change the time period extraction logic, you need to clear the old cache.

### 方法1: UIからクリア（開発モードのみ）

開発モードで実行中（`npm run dev`）、ヘッダーに紫色のゴミ箱ボタン🗑️が表示されます。このボタンをクリックするとキャッシュがクリアされ、ページがリロードされます。

In development mode (`npm run dev`), a purple trash button 🗑️ appears in the header. Click it to clear cache and reload.

### 方法2: URLパラメータ（開発モードのみ）

ブラウザで以下のURLにアクセス:
```
http://localhost:5173/?clearCache=1
```

キャッシュがクリアされ、URLパラメータが自動的に削除されます。

### 方法3: ブラウザの開発者ツール

1. F12キーで開発者ツールを開く
2. Consoleタブを選択
3. 以下のコマンドを実行:
```javascript
localStorage.removeItem('movieTimePeriodCache');
localStorage.removeItem('movieTimePeriodCacheVersion');
location.reload();
```

### 方法4: キャッシュバージョンを上げる（開発者向け）

`src/services/movieTimePeriodDb.ts`の`CURRENT_CACHE_VERSION`を増やすと、全ユーザーのキャッシュが自動的にクリアされます:

```typescript
const CURRENT_CACHE_VERSION = 4; // increment this number
```

## Technology Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **APIs**:
  - TMDb API (映画データ)
  - DeepSeek-V3 (高推論AI - 現代映画の時代設定推論)
  - Gemini Flash 2.0 (高速AI - コスト効率重視)
- **Backend**:
  - Vercel Serverless Functions (APIプロキシ)
  - Vercel KV (Redis) (レート制限)
- **Security**:
  - Zod (入力バリデーション)
  - CSP + セキュリティヘッダー
- **Testing**: Puppeteer
- **Optimization**:
  - Spatial Hashing (O(n) レイアウト計算)
  - React.memo (不要な再レンダリング防止)
  - Lazy Loading (画像の遅延読み込み)

## How It Works

### 時代設定の自動抽出

映画のタイトル、あらすじから以下の方法で時代設定を推定:

1. **年号の抽出**: "1912年", "in 1945", "2049-2077" などのパターン
2. **キーワード検出**: "第二次世界大戦", "江戸時代", "未来" など
3. **デフォルト**: 公開年を使用

### タイムラインレイアウト

- **比例的な配置**: 1年 = 10px（96dpiで約1cm）
- **定規**: 年代スパンに応じて自動調整されるマーカー
- **複数カラム**: 同じ年代の映画は横に並べて配置
- **最適化**: Spatial Hashing で O(n²) → O(n) に高速化
  - 100本の映画: 10,000回 → 100回の衝突判定
  - 1,000本の映画: 1,000,000回 → 1,000回の衝突判定

## Example Usage

1. **映画を検索**: "タイタニック" を検索
2. **自動抽出**: 時代設定が "1912年" と自動で設定される
3. **タイムライン表示**: 他の映画と年代差が正確に反映される

## Testing

自動テストが実装されています:

```bash
npm run test:auto
```

テスト内容:
- ページ読み込み確認
- 映画追加機能
- タイムライン表示
- コンソールエラー検出
- スクリーンショット撮影

## Development Guidelines for AI Assistants

### Browser Testing Protocol

When working on this project, especially for UI-related tasks, bugs, or feature implementations:

**CRITICAL RULES:**
1. **ALWAYS use MCP browser automation (Claude in Chrome) for testing after implementation**
2. **NEVER ask the user to manually test - YOU must test it yourself**
3. **If MCP is unavailable or requires browser restart, STOP and report to the user immediately**

**Testing is YOUR responsibility, not the user's.**

#### Required Steps for UI Bug Fixes:
1. **Start dev server**: Run `npm run dev` if not already running
2. **Open browser**: Use MCP tools to navigate to http://localhost:5173/
3. **Reproduce the bug**: Actually test the reported issue in the browser
4. **Check console errors**: Use `read_console_messages` to see JavaScript errors
5. **Make fixes**: Edit the code based on actual error messages
6. **Verify the fix**: Test again in the browser to confirm it works
7. **Build**: Run `npm run build` to ensure production build succeeds

#### When to Use Browser Testing:
- ✅ Any UI bug reports from users
- ✅ React component errors or rendering issues
- ✅ Adding new UI features or components
- ✅ CSS/styling changes
- ✅ User interaction flows (clicks, forms, navigation)

#### When Code Analysis Alone is Sufficient:
- Type definitions or interface changes
- Pure utility function implementations
- Configuration file updates
- Documentation updates

**Remember**: Don't rely solely on code analysis when you have the ability to actually test in a browser. Real-world testing catches issues that static analysis misses, especially React hooks violations, runtime errors, and visual rendering problems.

### When MCP Tools Are Not Available

If MCP (Model Context Protocol) tools like Claude in Chrome are not available or not connected:

**CRITICAL: Always request MCP access first before attempting manual testing.**

#### Steps to Take:

1. **Request MCP Connection**:
   ```
   User, I need to test this in a browser to verify the fix works correctly.
   Could you please:
   1. Install the Claude in Chrome extension if not already installed:
      https://chrome.google.com/webstore/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn
   2. Verify you're logged in to the extension (check the extension icon)
   3. Restart your browser completely
   4. Restart Claude Desktop

   This will allow me to test the changes directly in your browser.
   ```

2. **Alternative Testing Without MCP**:
   If MCP is not available, request the user to test:
   ```
   Since I cannot access the browser directly, please help test:

   1. Open http://localhost:5173/ in your browser
   2. Open Developer Tools (F12)
   3. Try [specific action]
   4. Check for any console errors
   5. Send me a screenshot if possible

   This will help me identify the exact issue.
   ```

3. **Automated Testing as Fallback**:
   ```bash
   # Run Puppeteer tests as an alternative
   npm run test:auto
   ```

#### What NOT to Do:
- ❌ **Don't guess at fixes**: Without browser testing, you might fix the wrong issue
- ❌ **Don't assume it works**: Code that looks correct can still have runtime errors
- ❌ **Don't skip verification**: Always verify your fix actually works in the browser

### Testing Workflow Example

**Bad approach** (code analysis only):
```
User: "The app crashes when clicking Add Movie"
Assistant: *reads code* "I see the issue, let me fix this import..."
Result: May or may not actually fix the issue
```

**Good approach** (browser testing):
```bash
1. npm run dev
2. Open browser via MCP
3. Click "Add Movie" button
4. Read console errors: "TypeError: Cannot read property 'map' of undefined"
5. Identify the actual root cause from runtime error
6. Fix the specific issue
7. Test again to confirm fix works
```

### When MCP Browser Tools Are Not Available

**CRITICAL**: If Claude in Chrome MCP is not connected or unavailable, you MUST:

1. **Request MCP Access**: Explicitly ask the user to:
   - Install the Claude in Chrome extension
   - Verify they're logged in to the extension
   - Restart their browser if needed
   - Restart Claude Desktop if the extension still doesn't connect

2. **Explain Why It's Needed**: Tell the user that browser testing is critical for:
   - Verifying UI bugs are actually fixed
   - Checking console errors in real-time
   - Testing user interaction flows
   - Confirming visual rendering is correct

3. **Alternative Testing Methods** (if MCP remains unavailable):
   - Run automated tests: `npm run test:auto`
   - Ask user to manually test and provide console logs
   - Use Node.js scripts to test API integrations
   - Build and check for compilation errors

4. **Never Skip Testing**: Do not just make code changes without testing, even if MCP is unavailable. Always verify through some method (automated tests, user feedback, etc.)

**Example Request to User**:
```
I need to test this in a browser to verify the fix works correctly.
The Claude in Chrome extension is not connected. Could you:

1. Install/verify the extension is installed
2. Make sure you're logged in to the extension (check the toolbar icon)
3. Restart your browser completely
4. Restart Claude Desktop

Once connected, I'll be able to test the changes in a real browser
to ensure everything works properly.
```

## License

MIT

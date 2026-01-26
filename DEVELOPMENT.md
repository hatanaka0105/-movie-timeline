# 開発ガイド

このドキュメントは開発者向けの詳細情報です。公開用のREADMEは [README.md](./README.md) を参照してください。

## 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [アーキテクチャ](#アーキテクチャ)
- [テスト](#テスト)
- [デバッグ](#デバッグ)
- [キャッシュ管理](#キャッシュ管理)
- [AI Assistants向けガイドライン](#ai-assistants向けガイドライン)

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. API キーの取得

開発環境では以下のAPIキーが必要です:

#### TMDb API キー
1. [TMDb](https://www.themoviedb.org/) にアカウント登録
2. [API設定ページ](https://www.themoviedb.org/settings/api) でAPIキーを取得

#### Gemini API キー
1. [Google AI Studio](https://makersuite.google.com/app/apikey) でAPIキーを取得

#### DeepSeek API キー (オプション、推奨)
1. [DeepSeek Platform](https://platform.deepseek.com/api_keys) でAPIキーを取得
2. 無料枠: 新規登録で500万トークン (30日間有効)

### 3. 環境変数設定

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

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:5173/ にアクセス

**注意**: `npm run dev`コマンドは対話的なサーバーとして起動するため、ターミナルのプロンプトは返ってきません。これは正常な動作です。サーバーが起動すると以下のようなメッセージが表示されます:

```
VITE v7.3.1  ready in 400 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

サーバーを停止するには`Ctrl+C`を押してください。

#### トラブルシューティング

**Node.jsバージョン警告が表示される場合**:
```
You are using Node.js 20.17.0. Vite requires Node.js version 20.19+ or 22.12+.
```

この警告が表示されても、Viteは動作します。警告を消すには以下のいずれかの方法でNode.jsをアップグレードしてください:
- nvm使用の場合: `nvm install 20.19` または `nvm install 22.12`
- 直接インストール: [Node.js公式サイト](https://nodejs.org/)から最新版をダウンロード

**サーバーが起動しているか確認する方法**:
```bash
# 別のターミナルで以下を実行
curl http://localhost:5173/
# または
node -e "fetch('http://localhost:5173/').then(r => console.log('Server is running!'))"
```

## アーキテクチャ

### システム構成

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

### 時代設定の自動抽出ロジック

映画のタイトル、あらすじから以下の方法で時代設定を推定:

1. **年号の抽出**: "1912年", "in 1945", "2049-2077" などのパターン
2. **キーワード検出**: "第二次世界大戦", "江戸時代", "未来" など
3. **デフォルト**: 公開年を使用

#### キーワード追加の重要な注意事項

**🚨 曖昧なキーワードは絶対に追加しないでください**

多くの映画の説明文に背景として登場する一般的な単語は、誤検出の原因になります。

**❌ 追加してはいけないキーワード例**:
- `jesus`, `christ`, `イエス`, `キリスト` - 多くの映画で背景的に言及される
- `crucifixion`, `磔刑`, `十字架` - 宗教的な背景として頻出
- `judea`, `ユダヤ` - 地理的背景として頻出
- `oil crisis`, `石油危機` - 歴史的背景として頻出
- その他、一般的な歴史用語や地名

**✅ 追加すべきキーワード例**:
- 具体的な映画タイトル: `ben-hur`, `ベン・ハー`
- フルネームの歴史上の人物: `alexander the great`, `napoleon bonaparte`
- 非常に特定的な歴史イベント: `pearl harbor attack`, `真珠湾攻撃`

**原則**: キーワードは「その単語が出たら確実にその時代を指す」場合のみ追加してください。多くの映画で背景的に言及される可能性がある単語は避けてください。

### タイムラインレイアウト

- **比例的な配置**: 1年 = 10px（96dpiで約1cm）
- **定規**: 年代スパンに応じて自動調整されるマーカー
- **複数カラム**: 同じ年代の映画は横に並べて配置
- **最適化**: Spatial Hashing で O(n²) → O(n) に高速化
  - 100本の映画: 10,000回 → 100回の衝突判定
  - 1,000本の映画: 1,000,000回 → 1,000回の衝突判定

## テスト

### 自動テストの実行

```bash
# 自動テスト実行
npm run test:auto

# ブラウザ監視モード（リアルタイムログ表示）
npm run monitor
```

テスト内容:
- ページ読み込み確認
- 映画追加機能
- タイムライン表示
- コンソールエラー検出
- スクリーンショット撮影

## デバッグ

### ビルドエラーの確認

```bash
npm run build
```

### 開発サーバーのログ確認

開発サーバー実行中は、ターミナルでエラーログを確認できます。

## キャッシュ管理

映画の時代設定データはlocalStorageにキャッシュされます。時代設定抽出ロジックを変更した場合、古いキャッシュをクリアする必要があります。

### 方法1: UIからクリア（開発モードのみ）

開発モードで実行中（`npm run dev`）、ヘッダーに紫色のゴミ箱ボタン🗑️が表示されます。このボタンをクリックするとキャッシュがクリアされ、ページがリロードされます。

### 方法2: URLパラメータ（開発モードのみ）

ブラウザで以下のURLにアクセス:
```
http://localhost:5173/?clearCache=1
```

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

時代設定抽出ロジックを変更した場合、以下の**3つのファイル**でキャッシュバージョンを同じ番号に更新する必要があります:

#### 1. フロントエンド - メインキャッシュ (`src/services/movieTimePeriodDb.ts`)
```typescript
const CURRENT_CACHE_VERSION = 13; // increment this number
```

#### 2. フロントエンド - 設定ファイル (`src/config/constants.ts`)
```typescript
export const CACHE_CONFIG = {
  CURRENT_VERSION: 13, // increment to match movieTimePeriodDb.ts
};
```

#### 3. バックエンド - Vercel KVキャッシュ (`api/movie-cache.ts`)
```typescript
const CACHE_VERSION = 13; // increment to match frontend
const CACHE_KEY = `movie-time-periods-v${CACHE_VERSION}`;
```

**重要**: 3つのファイルすべてで同じバージョン番号にしないと、フロントエンドとバックエンドでキャッシュの不一致が発生します。

### 方法5: 本番環境での完全なリフレッシュ

本番環境で古いキャッシュをクリアする場合:

1. **ブラウザの強制リロード**: `Ctrl+Shift+R` (Windows/Linux) または `Cmd+Shift+R` (Mac)
   - これでブラウザキャッシュとローカルストレージが強制的に再読み込みされます

2. **開発者ツールから手動クリア**:
   ```javascript
   // F12で開発者ツールを開き、Consoleで実行
   localStorage.clear();
   location.reload();
   ```

3. **Application/Storageタブから**:
   - F12で開発者ツールを開く
   - Applicationタブ → Local Storage → サイトのURL
   - `movieTimePeriodCache` と `movieTimePeriodCacheVersion` を削除
   - ページをリロード

**キャッシュバージョン更新後の確認方法**:
```javascript
// Consoleで実行してバージョンを確認
localStorage.getItem('movieTimePeriodCacheVersion');
// 正しいバージョン番号(例: "13")が返ればOK
```

## 開発フロー

### 🚨 重要な原則：実装後は必ずテストすること

**すべての実装の後、必ずテストを実行してください。**

- 新機能を追加したら → テスト
- バグを修正したら → テスト
- コードをリファクタリングしたら → テスト
- 依存関係を更新したら → テスト

テストなしで「完了」とは言えません。

### 開発サイクル

1. **要件理解** - 何を実装するのか明確にする
2. **設計** - どう実装するか計画する
3. **実装** - コードを書く
4. **テスト** - 動作確認する ← **ここが必須！**
5. **修正** - 問題があれば修正
6. **再テスト** - 修正後も必ずテスト
7. **コミット** - 問題がなければコミット

### コミット前のチェックリスト

- [ ] コードが正常にコンパイルされる
- [ ] ブラウザでテストを実行した
- [ ] エラーがコンソールに出ていない
- [ ] 既存機能が壊れていない（リグレッションテスト）
- [ ] コミットメッセージが明確

### デプロイ後の確認手順（必須）

**🚨 重要: `git push`後は必ず以下の手順でデプロイを確認すること**

1. **プッシュ後1分待つ**
   - Vercelのビルドとデプロイが完了するまで待機

2. **MCPブラウザツールでデプロイステータスを確認**
   ```
   URL: https://vercel.com/ccccradles-projects/movie-timeline/deployments
   ```

3. **デプロイ状態をチェック**
   - ✅ **成功 (Ready)**: 次の作業に進む
   - ❌ **失敗 (Error)**: エラーメッセージを確認して修正に戻る

4. **エラーが出た場合**
   - デプロイページのエラーログを読む
   - エラーの原因を特定
   - コードを修正
   - 再度テスト→コミット→プッシュ→確認のサイクルを繰り返す

**この確認を怠ると、本番環境が壊れた状態で放置されます。必ず実行してください。**

### やってはいけないこと

- ❌ テストせずにコミット
- ❌ テストせずに「完了」と報告
- ❌ エラーを無視
- ❌ 一度に大量の変更をコミット
- ❌ コンパイルエラーを放置

### 良い習慣

- ✅ 小さな単位で実装→テスト→コミット
- ✅ エラーが出たらすぐに修正
- ✅ コンソールログで動作を確認
- ✅ 複数のケースでテスト
- ✅ ドキュメントを更新

## AI Assistants向けガイドライン

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

## 共有データベースの戦略と将来ビジョン

### 現在のDB保存の仕組み

現在、映画の時代設定データは以下の条件でPostgreSQL共有DBに保存されます：

**保存される条件（`lookupAndCacheTimePeriod`が実行される場合）：**
- TMDbのメタデータだけでは時代設定が**推定値**になった映画
- つまり、タイトルやあらすじから明確な年代が抽出できなかった映画

**保存されない条件：**
- TMDbのデータだけで時代設定が確定できた映画
- 例：タイトルに「1945」が含まれる、あらすじに「第二次世界大戦」などの明確なキーワードがある

**保存フロー：**
```
映画追加 → TMDbメタデータで時代設定抽出
  ↓
  ├─ 確定 (isEstimated: false)
  │   └─ DBに保存されない ❌
  │
  └─ 推定値 (isEstimated: true)
      └─ AI/Wikipedia検索実行
          └─ 結果をDBに保存 ✅
```

**ファイル参照：**
- DB保存関数: `src/services/sharedDbApi.ts` の `saveTimePeriodToSharedDb()`
- AI検索関数: `src/services/aiTimePeriodLookup.ts` の `lookupAndCacheTimePeriod()`
- 呼び出し元: `src/components/MovieSearch.tsx` の148行目（isEstimatedがtrueの場合のみ）

### 将来ビジョン: API不要の最強DB

**最終目標：**
外部API（TMDb、DeepSeek、Gemini、Groq、Wikipedia）に依存せず、共有DB単体で全ての映画の正確な時代設定を提供できる自己完結型データベースを構築する。

**理想的な状態：**
```
映画追加 → 共有DBから時代設定取得 → 即座に表示完了
```

**達成のためのステップ：**

1. **データ収集フェーズ（現在）**
   - ユーザーが映画を追加するたびにAI/Wikipedia検索結果をDBに蓄積
   - 現在約50本/500本（約10%）のカバー率
   - 目標：主要映画10,000本以上の時代設定データを蓄積

2. **品質向上フェーズ**
   - 低信頼性データ（`reliability: 'low'`）の再検証
   - コミュニティ投票システムによる検証
   - 専門家による手動キュレーション

3. **完全カバレッジフェーズ**
   - TMDb上の全映画（数十万本）の時代設定データを網羅
   - 新作映画の自動追加パイプライン
   - 外部APIへの依存を完全に排除

**メリット：**
- ⚡ 超高速レスポンス（API呼び出し不要）
- 💰 コスト削減（AI APIの課金なし）
- 🔒 安定性向上（外部APIのレート制限・障害の影響なし）
- 🎯 精度向上（人間による検証済みデータ）

**実装上の注意点：**
- 全ての映画をDBに保存するには、`MovieSearch.tsx`を修正して`isEstimated`に関係なく常に`lookupAndCacheTimePeriod`を呼ぶか、TMDbデータから抽出した結果も`saveTimePeriodToSharedDb`で保存する必要がある
- ただし、TMDbデータからの抽出は精度が低い可能性があるため、AI/Wikipedia検索結果のみを信頼できるソースとして扱う現在の方針は妥当

**進捗確認方法：**
```sql
-- PostgreSQLで現在のDB登録件数を確認
SELECT COUNT(*) FROM movie_time_periods;
SELECT source, COUNT(*) FROM movie_time_periods GROUP BY source;
SELECT reliability, COUNT(*) FROM movie_time_periods GROUP BY reliability;
```

## セキュリティ

詳細は [`SECURITY.md`](./SECURITY.md) を参照してください。

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

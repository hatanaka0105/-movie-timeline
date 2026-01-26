# Amazon アソシエイト機能の設定方法

このアプリケーションには、Amazonアソシエイトリンクを表示する機能が組み込まれています。
環境変数を設定するだけで、すぐに収益化を開始できます。

## 1. Amazonアソシエイト・プログラムに登録

1. https://affiliate.amazon.co.jp/ にアクセス
2. 「参加申請をする」をクリック
3. アカウント情報を入力して登録完了
4. **アソシエイトID**（例: `yoursitename-22`）を取得

## 2. 環境変数を設定

### Vercel（本番環境）

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 新しい環境変数を追加:
   ```
   Name: NEXT_PUBLIC_AMAZON_ASSOCIATE_ID
   Value: yoursitename-22
   Environment: Production
   ```
5. **Save** をクリック
6. プロジェクトを再デプロイ

### ローカル開発環境

`.env.local`ファイルに以下を追加:

```bash
NEXT_PUBLIC_AMAZON_ASSOCIATE_ID=yoursitename-22
```

## 3. 機能が自動的に有効化される

環境変数を設定すると、以下の機能が自動的に表示されます：

### ✅ 映画カードにAmazonリンクボタン
- **Prime Video** ボタン（青色）
- **DVD/Blu-ray** ボタン（オレンジ色）

### ✅ フッターにアソシエイト表記
> 当サイトはAmazonアソシエイト・プログラムの参加者です。Amazonでの購入により収益を得る場合があります。

## 4. 動作確認

1. 映画カードを表示
2. カード下部に「Prime Video」と「DVD/Blu-ray」ボタンが表示されることを確認
3. ボタンをクリックしてAmazonに遷移
4. URLに `tag=yoursitename-22` が含まれていることを確認

## 5. 収益の確認

1. https://affiliate.amazon.co.jp/ にログイン
2. **レポート** → **注文レポート**
3. クリック数・成果数・報酬額を確認

## トラブルシューティング

### Q: ボタンが表示されない
- 環境変数 `NEXT_PUBLIC_AMAZON_ASSOCIATE_ID` が正しく設定されているか確認
- Vercelの場合は再デプロイが必要
- ブラウザのキャッシュをクリア

### Q: リンクにアソシエイトタグが付いていない
- 環境変数の値を確認（例: `yoursitename-22`）
- スペースや改行が含まれていないか確認

### Q: 収益が発生しない
- クリックされてから24時間以内に購入が必要
- Amazonの審査を通過している必要がある
- 審査通過前でもトラッキングは可能

## 無効化する方法

環境変数 `NEXT_PUBLIC_AMAZON_ASSOCIATE_ID` を削除するだけで、
すべてのAmazonリンクと表記が自動的に非表示になります。

既存のUIには一切影響しません。

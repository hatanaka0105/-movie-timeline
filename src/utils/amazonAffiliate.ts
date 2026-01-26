/**
 * Amazon アソシエイトリンク生成ユーティリティ
 *
 * 環境変数 NEXT_PUBLIC_AMAZON_ASSOCIATE_ID が設定されている場合のみ有効化
 */

/**
 * Amazonアソシエイト機能が有効かどうかチェック
 */
export function isAmazonAffiliateEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID;
}

/**
 * 映画タイトルからAmazon検索URLを生成（アソシエイトタグ付き）
 */
export function generateAmazonSearchUrl(movieTitle: string): string {
  const associateId = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID;

  if (!associateId) {
    // フォールバック: アソシエイトタグなしの通常リンク
    const searchQuery = encodeURIComponent(movieTitle);
    return `https://www.amazon.co.jp/s?k=${searchQuery}&i=dvd`;
  }

  // アソシエイトタグ付きリンク
  const searchQuery = encodeURIComponent(movieTitle);
  return `https://www.amazon.co.jp/s?k=${searchQuery}&i=dvd&tag=${associateId}`;
}

/**
 * Prime Video直接検索URL生成
 */
export function generatePrimeVideoUrl(movieTitle: string): string {
  const associateId = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID;
  const searchQuery = encodeURIComponent(movieTitle);

  if (!associateId) {
    return `https://www.amazon.co.jp/s?k=${searchQuery}&i=instant-video`;
  }

  return `https://www.amazon.co.jp/s?k=${searchQuery}&i=instant-video&tag=${associateId}`;
}

/**
 * アソシエイト表記テキストを取得
 */
export function getAffiliateDisclaimer(): string {
  return '当サイトはAmazonアソシエイト・プログラムの参加者です。Amazonでの購入により収益を得る場合があります。';
}

/**
 * クリックイベントをトラッキング（Google Analyticsなど用）
 */
export function trackAmazonClick(movieTitle: string, linkType: 'search' | 'prime-video'): void {
  // Google Analytics がある場合のトラッキング
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'amazon_affiliate_click', {
      movie_title: movieTitle,
      link_type: linkType,
    });
  }

  // デバッグ用ログ
  console.log(`[Amazon Affiliate] Click tracked: ${movieTitle} (${linkType})`);
}

import { kv } from '@vercel/kv';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime?: number;
}

/**
 * IPベースのレート制限
 * @param ip クライアントのIPアドレス
 * @param limit ウィンドウ内で許可されるリクエスト数
 * @param window ウィンドウの秒数（デフォルト: 3600秒 = 1時間）
 */
export async function rateLimit(
  ip: string,
  limit = 100,
  window = 3600
): Promise<RateLimitResult> {
  const key = `rate_limit:${ip}`;

  try {
    const current = await kv.get<number>(key);

    if (current === null) {
      // 初回リクエスト
      await kv.set(key, 1, { ex: window });
      return { success: true, remaining: limit - 1 };
    }

    if (current >= limit) {
      // レート制限超過
      const ttl = await kv.ttl(key);
      return {
        success: false,
        remaining: 0,
        resetTime: ttl > 0 ? Date.now() + ttl * 1000 : undefined
      };
    }

    // カウンターをインクリメント
    await kv.incr(key);
    return { success: true, remaining: limit - current - 1 };

  } catch (error) {
    console.error('Rate limit error:', error);
    // エラー時は制限をスキップ（fail-open）
    return { success: true, remaining: limit };
  }
}

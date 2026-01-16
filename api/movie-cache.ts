import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

interface TimePeriodData {
  startYear: number | null;
  endYear: number | null;
  period: string;
  additionalYears?: number[];
}

interface CacheData {
  [movieId: string]: TimePeriodData;
}

const CACHE_KEY = 'movie-time-periods';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // 全キャッシュデータを返す
      const cache = await kv.get<CacheData>(CACHE_KEY) || {};
      return res.status(200).json(cache);
    }

    if (req.method === 'POST') {
      // 新しいキャッシュエントリを追加
      const { movieId, data } = req.body as {
        movieId: string;
        data: TimePeriodData;
      };

      if (!movieId || !data) {
        return res.status(400).json({ error: 'movieId and data are required' });
      }

      // 既存のキャッシュを読み込み
      const cache = await kv.get<CacheData>(CACHE_KEY) || {};

      // 新しいエントリを追加（既存のものは上書きしない）
      if (!cache[movieId]) {
        cache[movieId] = data;
        await kv.set(CACHE_KEY, cache);
        return res.status(200).json({ success: true, message: 'Cache updated' });
      } else {
        return res.status(200).json({ success: true, message: 'Cache already exists' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

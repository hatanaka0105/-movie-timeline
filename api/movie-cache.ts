import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { rateLimit } from '../lib/rateLimit.js';
import { z } from 'zod';

interface TimePeriodData {
  startYear: number | null;
  endYear: number | null;
  period: string;
  additionalYears?: number[];
}

interface CacheData {
  [movieId: string]: TimePeriodData;
}

const CACHE_VERSION = 12; // v12: Fixed Wikipedia search + Japanese locale support
const CACHE_KEY = `movie-time-periods-v${CACHE_VERSION}`;

// 入力検証スキーマ
const TimePeriodSchema = z.object({
  movieId: z.string().regex(/^\d+$/, 'movieId must be a numeric string'),
  data: z.object({
    startYear: z.number().int().min(-10000).max(3000).nullable(),
    endYear: z.number().int().min(-10000).max(3000).nullable(),
    period: z.string().max(100),
    additionalYears: z.array(z.number().int()).optional(),
  }),
});

const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定 - オリジンを厳格に制限
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // レート制限: 1時間あたり100リクエスト
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             (req.headers['x-real-ip'] as string) ||
             'unknown';
  const rateLimitResult = await rateLimit(ip, 100, 3600);

  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: rateLimitResult.resetTime
    });
  }

  try {
    if (req.method === 'GET') {
      // 全キャッシュデータを返す
      const cache = await kv.get<CacheData>(CACHE_KEY) || {};
      return res.status(200).json(cache);
    }

    if (req.method === 'POST') {
      // 入力検証
      try {
        const validated = TimePeriodSchema.parse(req.body);
        const { movieId, data } = validated;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Invalid input',
            details: error.issues
          });
        }
        throw error;
      }

      // 新しいキャッシュエントリを追加
      const { movieId, data } = req.body as {
        movieId: string;
        data: TimePeriodData;
      };

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

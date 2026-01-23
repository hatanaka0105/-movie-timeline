import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMovieTimePeriod, saveMovieTimePeriod, getMovieTimePeriodsBatch } from '../lib/postgres.js';
import { rateLimit } from '../lib/rateLimit.js';

const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
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

  // レート制限: 1時間あたり500リクエスト（読み取りが多いため）
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             (req.headers['x-real-ip'] as string) ||
             'unknown';
  const rateLimitResult = await rateLimit(ip, 500, 3600);

  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: rateLimitResult.resetTime
    });
  }

  try {
    // GET: 時代設定を取得
    if (req.method === 'GET') {
      const { tmdbId, tmdbIds } = req.query;

      // 単一取得
      if (tmdbId && typeof tmdbId === 'string') {
        const id = parseInt(tmdbId, 10);
        if (isNaN(id)) {
          return res.status(400).json({ error: 'Invalid tmdbId' });
        }

        const result = await getMovieTimePeriod(id);
        if (!result) {
          return res.status(404).json({ error: 'Not found' });
        }

        return res.status(200).json(result);
      }

      // 一括取得
      if (tmdbIds && typeof tmdbIds === 'string') {
        const ids = tmdbIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        if (ids.length === 0) {
          return res.status(400).json({ error: 'Invalid tmdbIds' });
        }

        const results = await getMovieTimePeriodsBatch(ids);
        return res.status(200).json(Object.fromEntries(results));
      }

      return res.status(400).json({ error: 'tmdbId or tmdbIds parameter required' });
    }

    // POST: 時代設定を保存
    if (req.method === 'POST') {
      const {
        tmdbId,
        title,
        originalTitle,
        startYear,
        endYear,
        period,
        source,
        notes,
        additionalYears,
        reliability
      } = req.body;

      // バリデーション
      if (!tmdbId || typeof tmdbId !== 'number') {
        return res.status(400).json({ error: 'tmdbId (number) is required' });
      }
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title (string) is required' });
      }
      if (!period || typeof period !== 'string') {
        return res.status(400).json({ error: 'period (string) is required' });
      }
      if (!source || typeof source !== 'string') {
        return res.status(400).json({ error: 'source (string) is required' });
      }
      if (!reliability || typeof reliability !== 'string') {
        return res.status(400).json({ error: 'reliability (string) is required' });
      }

      const result = await saveMovieTimePeriod({
        tmdbId,
        title,
        originalTitle,
        startYear: startYear !== undefined ? startYear : null,
        endYear: endYear !== undefined ? endYear : null,
        period,
        source,
        notes,
        additionalYears,
        reliability
      });

      if (!result) {
        return res.status(500).json({ error: 'Failed to save' });
      }

      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Movie time period API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

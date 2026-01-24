import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../lib/rateLimit.js';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // レート制限: 1時間あたり1000リクエスト（検索が多いため）
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             (req.headers['x-real-ip'] as string) ||
             'unknown';
  const rateLimitResult = await rateLimit(ip, 1000, 3600);

  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: rateLimitResult.resetTime
    });
  }

  try {
    const { endpoint, ...params } = req.query;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'endpoint parameter is required' });
    }

    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // APIキーを追加してTMDbにリクエスト
    const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('TMDb proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

interface TimePeriodData {
  startYear: number | null;
  endYear: number | null;
  period: string;
  additionalYears?: number[];
}

interface CacheData {
  [movieId: string]: TimePeriodData;
}

const CACHE_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'movie-cache.json');

// キャッシュファイルを読み込む
function loadCache(): CacheData {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load cache:', error);
  }
  return {};
}

// キャッシュファイルに書き込む
function saveCache(cache: CacheData): void {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Failed to save cache:', error);
    throw error;
  }
}

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
      const cache = loadCache();
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
      const cache = loadCache();

      // 新しいエントリを追加（既存のものは上書きしない）
      if (!cache[movieId]) {
        cache[movieId] = data;
        saveCache(cache);
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

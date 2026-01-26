/**
 * ユーザーからの時代設定修正申告を受け付けるAPI
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export const config = {
  maxDuration: 10,
};

interface CorrectionRequest {
  tmdb_id: number;
  title: string;
  current_start_year?: number;
  current_end_year?: number;
  current_period: string;
  current_reliability?: string;
  suggested_period: string;
  suggested_start_year?: number;
  suggested_end_year?: number;
  user_reason?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as CorrectionRequest;

  // バリデーション
  if (!body.tmdb_id || !body.title || !body.suggested_period) {
    return res.status(400).json({
      error: 'Missing required fields: tmdb_id, title, suggested_period'
    });
  }

  // スパム対策: IPアドレスとUser-Agentを取得
  const userIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                 (req.headers['x-real-ip'] as string) ||
                 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 同一IPからの連続投稿を制限（1分以内に同じ映画への申告は拒否）
    const recentCheck = await client.query(
      `SELECT id FROM user_corrections
       WHERE tmdb_id = $1 AND user_ip = $2
       AND created_at > NOW() - INTERVAL '1 minute'`,
      [body.tmdb_id, userIp]
    );

    if (recentCheck.rows.length > 0) {
      return res.status(429).json({
        error: 'Too many requests. Please wait before submitting again.'
      });
    }

    // 申告を保存
    const query = `
      INSERT INTO user_corrections (
        tmdb_id,
        title,
        current_start_year,
        current_end_year,
        current_period,
        current_reliability,
        suggested_start_year,
        suggested_end_year,
        suggested_period,
        user_reason,
        user_ip,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const result = await client.query(query, [
      body.tmdb_id,
      body.title,
      body.current_start_year || null,
      body.current_end_year || null,
      body.current_period,
      body.current_reliability || null,
      body.suggested_start_year || null,
      body.suggested_end_year || null,
      body.suggested_period,
      body.user_reason || null,
      userIp,
      userAgent
    ]);

    const correctionId = result.rows[0].id;

    console.log(`[USER_CORRECTION] New correction #${correctionId} for ${body.title} (${body.tmdb_id})`);

    return res.status(201).json({
      success: true,
      correction_id: correctionId,
      message: 'Thank you for your correction! It will be reviewed.'
    });

  } catch (error: any) {
    console.error('[USER_CORRECTION] Error:', error);
    return res.status(500).json({
      error: 'Failed to save correction',
      details: error.message
    });
  } finally {
    await client.end();
  }
}

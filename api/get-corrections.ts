/**
 * ユーザー申告の一覧を取得するAPI（管理者用）
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { status = 'pending', summary = 'false' } = req.query;

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    if (summary === 'true') {
      // 集約ビューを使用
      const query = `
        SELECT * FROM user_corrections_summary
        ORDER BY correction_count DESC, latest_correction DESC
        LIMIT 100
      `;

      const result = await client.query(query);

      return res.status(200).json({
        success: true,
        summary: result.rows
      });
    } else {
      // 個別の申告を取得
      const query = `
        SELECT
          id,
          tmdb_id,
          title,
          current_period,
          current_start_year,
          current_end_year,
          suggested_period,
          suggested_start_year,
          suggested_end_year,
          user_reason,
          status,
          created_at
        FROM user_corrections
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const result = await client.query(query, [status]);

      return res.status(200).json({
        success: true,
        corrections: result.rows,
        count: result.rows.length
      });
    }

  } catch (error: any) {
    console.error('[GET_CORRECTIONS] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch corrections',
      details: error.message
    });
  } finally {
    await client.end();
  }
}

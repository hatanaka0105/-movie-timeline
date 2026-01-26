/**
 * Vercel Cron Job: 月次時代設定検証
 *
 * 毎週日曜日 午前3時（UTC）に実行され、月の第1週のみ処理を行う
 *
 * Vercel Cron設定:
 * - vercel.json に "crons" フィールドを追加
 * - スケジュール: "0 3 * * 0" (毎週日曜日 午前3時 UTC)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

// Vercel Cron Job設定（vercel.jsonで指定）
export const config = {
  maxDuration: 300, // 5分タイムアウト（月100件の検証に十分）
};

interface ValidationResult {
  is_correct: boolean;
  proposed_start_year: number | null;
  proposed_end_year: number | null;
  proposed_period: string;
  proposed_additional_years: number[] | null;
  proposed_reliability: string;
  confidence: number;
  reasoning: string;
  evidence_sources: string[];
}

/**
 * DeepSeek-V3 APIで時代設定を検証
 */
async function validateWithDeepSeek(movie: any): Promise<ValidationResult> {
  const prompt = `あなたは映画の時代設定を検証する専門家です。以下の映画の時代設定が正確かどうか検証してください。

【映画情報】
タイトル: ${movie.title}
原題: ${movie.original_title || movie.title}
公開年: ${movie.release_year || 'N/A'}
TMDb ID: ${movie.tmdb_id}

【現在のDB登録値】
時代設定: ${movie.current_period}
開始年: ${movie.current_start_year || 'N/A'}
終了年: ${movie.current_end_year || 'N/A'}
追加年: ${movie.current_additional_years ? JSON.stringify(movie.current_additional_years) : 'N/A'}
信頼度: ${movie.current_reliability}
出典: ${movie.source}

【タスク】
1. この映画の「物語の舞台となる時代」を特定してください
   - 注意: 公開年ではなく、劇中の時代を答えてください
   - 例: Blade Runner (1982年公開) → 2019年が舞台

2. 現在のDB値が正確か評価してください

3. 必ず以下のJSON形式で最終的な回答を提供してください。
   推論プロセスを含めても構いませんが、必ず最後に有効なJSONを出力してください：
{
  "is_correct": true or false,
  "proposed_start_year": 数値 or null,
  "proposed_end_year": 数値 or null,
  "proposed_period": "文字列",
  "proposed_additional_years": [数値の配列] or null,
  "proposed_reliability": "high" or "medium" or "low",
  "confidence": 0.0から1.0の数値,
  "reasoning": "変更（または維持）する理由の説明",
  "evidence_sources": ["根拠となるURL1", "根拠となるURL2"]
}

【信頼度の基準】
- high: 複数の信頼できるソースで確認できる明確な時代設定
- medium: タイトルやあらすじから推測できるが明示されていない
- low: 不明確または複数の時代にまたがる

重要: 推測ではなく、具体的な根拠に基づいて判断してください。`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;
  let content = message.content || '';

  if (message.reasoning_content) {
    content = message.reasoning_content + '\n' + content;
  }

  // JSON抽出
  let result: ValidationResult | null = null;

  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    result = JSON.parse(jsonMatch[1].trim());
  } else {
    const jsonBlocks = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonBlocks && jsonBlocks.length > 0) {
      for (let i = jsonBlocks.length - 1; i >= 0; i--) {
        try {
          result = JSON.parse(jsonBlocks[i]);
          if (result && 'is_correct' in result) break;
        } catch (e) {
          continue;
        }
      }
    }
  }

  if (!result || result.is_correct === undefined) {
    throw new Error('Valid JSON response not found');
  }

  return result;
}

/**
 * 提案をvalidation_proposalsテーブルに保存
 */
async function saveProposal(
  client: Client,
  movie: any,
  validation: ValidationResult
): Promise<boolean> {
  if (validation.is_correct) {
    return false; // 変更不要
  }

  const query = `
    INSERT INTO validation_proposals (
      movie_time_period_id,
      tmdb_id,
      title,
      current_start_year,
      current_end_year,
      current_period,
      current_additional_years,
      current_reliability,
      proposed_start_year,
      proposed_end_year,
      proposed_period,
      proposed_additional_years,
      proposed_reliability,
      validation_source,
      validation_confidence,
      validation_reasoning,
      validation_evidence
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  `;

  await client.query(query, [
    movie.id,
    movie.tmdb_id,
    movie.title,
    movie.current_start_year,
    movie.current_end_year,
    movie.current_period,
    movie.current_additional_years,
    movie.current_reliability,
    validation.proposed_start_year,
    validation.proposed_end_year,
    validation.proposed_period,
    validation.proposed_additional_years,
    validation.proposed_reliability,
    'deepseek_v3',
    validation.confidence,
    validation.reasoning,
    validation.evidence_sources,
  ]);

  return true;
}

/**
 * メイン処理
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const now = new Date();
  const dayOfMonth = now.getUTCDate();

  // 月の第1週（1-7日）以外はスキップ
  if (dayOfMonth > 7) {
    return res.status(200).json({
      message: 'Skipped: Not first week of month',
      date: now.toISOString(),
      dayOfMonth
    });
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('[VALIDATION] Starting monthly validation...');
    await client.connect();

    // 検証対象の映画を取得（信頼度: medium, low）
    const query = `
      SELECT
        id,
        tmdb_id,
        title,
        original_title,
        start_year as current_start_year,
        end_year as current_end_year,
        period as current_period,
        additional_years as current_additional_years,
        reliability as current_reliability,
        source,
        updated_at
      FROM movie_time_periods
      WHERE reliability IN ('medium', 'low')
      ORDER BY updated_at ASC
      LIMIT 100
    `;

    const result = await client.query(query);
    const movies = result.rows;

    console.log(`[VALIDATION] Found ${movies.length} movies to validate`);

    let proposalCount = 0;
    let correctCount = 0;
    let errorCount = 0;

    for (const movie of movies) {
      try {
        const validation = await validateWithDeepSeek(movie);
        const saved = await saveProposal(client, movie, validation);

        if (saved) {
          proposalCount++;
          console.log(`[VALIDATION] Proposal created for: ${movie.title}`);
        } else {
          correctCount++;
        }

        // レート制限対策: 1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        errorCount++;
        console.error(`[VALIDATION] Error for ${movie.title}:`, error.message);
      }
    }

    const summary = {
      success: true,
      date: now.toISOString(),
      movies_validated: movies.length,
      proposals_created: proposalCount,
      already_correct: correctCount,
      errors: errorCount,
    };

    console.log('[VALIDATION] Completed:', summary);

    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('[VALIDATION] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      date: now.toISOString()
    });
  } finally {
    await client.end();
  }
}

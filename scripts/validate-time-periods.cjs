/**
 * 時代設定の検証スクリプト（Phase 1: MVP）
 *
 * このスクリプトは、Neon PostgreSQL内の時代設定データを検証し、
 * DeepSeek-V3を使って提案を生成します。
 *
 * 使用方法:
 *   node scripts/validate-time-periods.js --limit 10
 *   node scripts/validate-time-periods.js --reliability low --limit 50
 */

const https = require('https');
const { Client } = require('pg');

// コマンドライン引数のパース
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const reliabilityIndex = args.indexOf('--reliability');

const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 10;
const RELIABILITY_FILTER = reliabilityIndex !== -1
  ? [args[reliabilityIndex + 1]]
  : ['medium', 'low'];

console.log(`🔍 検証設定:`);
console.log(`  - 対象信頼度: ${RELIABILITY_FILTER.join(', ')}`);
console.log(`  - 最大件数: ${LIMIT}`);
console.log('');

// データベース接続文字列（Vercelの環境変数から取得）
const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ エラー: DATABASE_URL または POSTGRES_URL 環境変数が設定されていません');
  console.error('   Vercelの環境変数を確認してください');
  process.exit(1);
}

// DeepSeek APIキー
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error('❌ エラー: VITE_DEEPSEEK_API_KEY 環境変数が設定されていません');
  process.exit(1);
}

/**
 * DeepSeek-V3 APIを呼び出して時代設定を検証
 */
async function validateWithDeepSeek(movie) {
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

重要: 推測ではなく、具体的な根拠に基づいて判断してください。JSONのみを返してください。`;

  const requestData = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const message = response.choices[0].message;

            // DeepSeek-Reasonerの場合、reasoning_contentとcontentの両方をチェック
            let content = message.content || '';

            // reasoning_contentがある場合は、そちらを優先（推論プロセス）
            if (message.reasoning_content) {
              content = message.reasoning_content + '\n' + content;
            }

            // 複数のパターンでJSON抽出を試行
            let result = null;

            // パターン1: ```json ``` で囲まれたJSON
            let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[1].trim());
            } else {
              // パターン2: 最後の完全な{...}ブロック（最も一般的）
              const jsonBlocks = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
              if (jsonBlocks && jsonBlocks.length > 0) {
                // 最後のJSONブロックを使用（通常は最終的な回答）
                const lastBlock = jsonBlocks[jsonBlocks.length - 1];
                try {
                  result = JSON.parse(lastBlock);
                } catch (e) {
                  // パースに失敗した場合、すべてのブロックを試行
                  for (let i = jsonBlocks.length - 1; i >= 0; i--) {
                    try {
                      result = JSON.parse(jsonBlocks[i]);
                      break;
                    } catch (innerError) {
                      continue;
                    }
                  }
                }
              }
            }

            if (result && result.is_correct !== undefined) {
              resolve(result);
            } else {
              // デバッグ用に応答内容をログ出力
              console.error('  ⚠️  パース失敗 - 応答の最初の200文字:');
              console.error('  ', content.substring(0, 200));
              reject(new Error('有効なJSON応答が見つかりませんでした'));
            }
          } catch (error) {
            reject(new Error(`応答のパースに失敗: ${error.message}`));
          }
        } else {
          reject(new Error(`DeepSeek API エラー: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * 検証結果をvalidation_proposalsテーブルに保存
 */
async function saveProposal(client, movie, validation) {
  if (validation.is_correct) {
    console.log(`  ✅ 変更不要（現在の値が正確）`);
    return false;
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
    RETURNING id
  `;

  const values = [
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
    validation.evidence_sources
  ];

  const result = await client.query(query, values);
  console.log(`  💾 提案を保存しました (ID: ${result.rows[0].id})`);
  return true;
}

/**
 * メイン処理
 */
async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 データベースに接続中...\n');
    await client.connect();

    // 検証対象の映画を取得
    const reliabilityPlaceholders = RELIABILITY_FILTER.map((_, i) => `$${i + 1}`).join(', ');
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
      WHERE reliability IN (${reliabilityPlaceholders})
      ORDER BY updated_at ASC
      LIMIT $${RELIABILITY_FILTER.length + 1}
    `;

    const result = await client.query(query, [...RELIABILITY_FILTER, LIMIT]);
    const movies = result.rows;

    console.log(`📋 ${movies.length}件の映画を検証します\n`);

    let proposalCount = 0;
    let correctCount = 0;

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      console.log(`[${i + 1}/${movies.length}] 🎬 ${movie.title} (${movie.tmdb_id})`);
      console.log(`  現在: ${movie.current_period} (${movie.current_reliability})`);

      try {
        const validation = await validateWithDeepSeek(movie);
        console.log(`  DeepSeek判定: ${validation.is_correct ? '正確' : '要変更'} (信頼度: ${validation.confidence})`);

        if (!validation.is_correct) {
          console.log(`  提案: ${validation.proposed_period} (${validation.proposed_reliability})`);
          console.log(`  理由: ${validation.reasoning.substring(0, 100)}...`);
        }

        const saved = await saveProposal(client, movie, validation);
        if (saved) {
          proposalCount++;
        } else {
          correctCount++;
        }

        // レート制限対策: 1秒待機
        if (i < movies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 検証完了サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 変更不要（正確）: ${correctCount}件`);
    console.log(`⚠️  変更提案あり: ${proposalCount}件`);
    console.log('');
    console.log('次のステップ:');
    console.log('  node scripts/review-proposals.js');
    console.log('');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

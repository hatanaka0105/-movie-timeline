/**
 * ユーザー申告をデータベースに反映
 *
 * PRマージ時に実行され、user-corrections.jsonの内容を
 * movie_time_periodsテーブルに反映します。
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const jsonPath = path.join(__dirname, '..', '.github', 'user-corrections.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('ℹ️  user-corrections.json が見つかりません。適用する申告がない可能性があります。');
    return;
  }

  const correctionsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const corrections = correctionsData.corrections;

  if (!corrections || corrections.length === 0) {
    console.log('✅ 適用する申告がありません');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('📡 データベースに接続しました\n');
    console.log(`📋 ${corrections.length}件の申告を適用します\n`);

    let appliedCount = 0;
    let errorCount = 0;

    for (const correction of corrections) {
      try {
        console.log(`[${appliedCount + errorCount + 1}/${corrections.length}] 🎬 ${correction.title}`);

        // トランザクション開始
        await client.query('BEGIN');

        // 1. movie_time_periodsテーブルを更新
        const updateQuery = `
          UPDATE movie_time_periods
          SET
            start_year = $1,
            end_year = $2,
            period = $3,
            reliability = 'high',
            source = 'user_correction',
            updated_at = NOW()
          WHERE tmdb_id = $4
        `;

        await client.query(updateQuery, [
          correction.suggested.start_year,
          correction.suggested.end_year,
          correction.suggested.period,
          correction.tmdb_id
        ]);

        // 2. user_correctionsテーブルのステータスを更新
        const approveQuery = `
          UPDATE user_corrections
          SET
            status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = 'github_actions'
          WHERE id = $1
        `;

        await client.query(approveQuery, [correction.id]);

        await client.query('COMMIT');

        console.log(`  ✅ 適用完了: ${correction.current.period} → ${correction.suggested.period}`);
        appliedCount++;

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ エラー: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 適用完了サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 成功: ${appliedCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);
    console.log('');

    if (appliedCount > 0) {
      console.log('✨ データベースが更新されました！');
      console.log('📊 信頼度: user_correction (ユーザー申告による修正)');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

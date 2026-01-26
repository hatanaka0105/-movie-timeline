/**
 * 検証提案をデータベースに反映
 *
 * PRマージ時に実行され、validation-proposals.jsonの内容を
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
  const jsonPath = path.join(__dirname, '..', '.github', 'validation-proposals.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('ℹ️  validation-proposals.json が見つかりません。提案がない可能性があります。');
    return;
  }

  const proposalsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const proposals = proposalsData.proposals;

  if (!proposals || proposals.length === 0) {
    console.log('✅ 適用する提案がありません');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('📡 データベースに接続しました\n');
    console.log(`📋 ${proposals.length}件の提案を適用します\n`);

    let appliedCount = 0;
    let errorCount = 0;

    for (const proposal of proposals) {
      try {
        console.log(`[${appliedCount + errorCount + 1}/${proposals.length}] 🎬 ${proposal.title}`);

        // トランザクション開始
        await client.query('BEGIN');

        // 1. movie_time_periodsテーブルを更新
        const updateQuery = `
          UPDATE movie_time_periods
          SET
            start_year = $1,
            end_year = $2,
            period = $3,
            reliability = $4,
            source = 'deepseek_v3',
            updated_at = NOW()
          WHERE tmdb_id = $5
        `;

        await client.query(updateQuery, [
          proposal.proposed.start_year,
          proposal.proposed.end_year,
          proposal.proposed.period,
          proposal.proposed.reliability,
          proposal.tmdb_id
        ]);

        // 2. validation_proposalsテーブルのステータスを更新
        const approveQuery = `
          UPDATE validation_proposals
          SET
            status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = 'github_actions'
          WHERE id = $1
        `;

        await client.query(approveQuery, [proposal.id]);

        await client.query('COMMIT');

        console.log(`  ✅ 適用完了: ${proposal.current.period} → ${proposal.proposed.period}`);
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
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

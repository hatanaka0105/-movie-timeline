/**
 * 検証提案のレビュー・承認スクリプト（Phase 1: MVP）
 *
 * このスクリプトは、validation_proposalsテーブルに保存された提案を
 * 表示し、承認・却下を行います。
 *
 * 使用方法:
 *   node scripts/review-proposals.js                    # すべての保留中の提案を表示
 *   node scripts/review-proposals.js --id 1             # 特定の提案の詳細を表示
 *   node scripts/review-proposals.js --approve 1        # 提案を承認
 *   node scripts/review-proposals.js --reject 1         # 提案を却下
 *   node scripts/review-proposals.js --approve-all      # すべての高信頼度提案を承認
 */

const { Client } = require('pg');

// コマンドライン引数のパース
const args = process.argv.slice(2);
const idIndex = args.indexOf('--id');
const approveIndex = args.indexOf('--approve');
const rejectIndex = args.indexOf('--reject');
const approveAllIndex = args.indexOf('--approve-all');

const PROPOSAL_ID = idIndex !== -1 ? parseInt(args[idIndex + 1]) : null;
const APPROVE_ID = approveIndex !== -1 ? parseInt(args[approveIndex + 1]) : null;
const REJECT_ID = rejectIndex !== -1 ? parseInt(args[rejectIndex + 1]) : null;
const APPROVE_ALL = approveAllIndex !== -1;

// データベース接続文字列
const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ エラー: DATABASE_URL または POSTGRES_URL 環境変数が設定されていません');
  process.exit(1);
}

/**
 * すべての保留中の提案を表示
 */
async function listProposals(client) {
  const query = `
    SELECT
      id,
      title,
      current_period,
      proposed_period,
      current_reliability,
      proposed_reliability,
      validation_confidence,
      created_at
    FROM validation_proposals
    WHERE status = 'pending'
    ORDER BY validation_confidence DESC, created_at DESC
  `;

  const result = await client.query(query);
  const proposals = result.rows;

  if (proposals.length === 0) {
    console.log('ℹ️  保留中の提案はありません');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔍 時代設定の検証提案 (${proposals.length}件の変更提案)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  proposals.forEach((p, i) => {
    const confidence = (p.validation_confidence * 100).toFixed(0);
    const reliabilityChange = `${p.current_reliability} → ${p.proposed_reliability}`;

    console.log(`[${p.id}] 🎬 ${p.title}`);
    console.log(`     信頼度: ${reliabilityChange}`);
    console.log(`     変更: ${p.current_period} → ${p.proposed_period}`);
    console.log(`     信頼度スコア: ${confidence}%`);
    console.log('');
  });

  console.log('詳細を見る: node scripts/review-proposals.js --id <ID>');
  console.log('承認する:   node scripts/review-proposals.js --approve <ID>');
  console.log('却下する:   node scripts/review-proposals.js --reject <ID>');
  console.log('');
}

/**
 * 特定の提案の詳細を表示
 */
async function showProposalDetail(client, id) {
  const query = `
    SELECT * FROM validation_proposals WHERE id = $1
  `;

  const result = await client.query(query, [id]);

  if (result.rows.length === 0) {
    console.log(`❌ 提案ID ${id} が見つかりません`);
    return;
  }

  const p = result.rows[0];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎬 ${p.title} (TMDb ID: ${p.tmdb_id})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('【変更前】');
  console.log(`  時代設定: ${p.current_period}`);
  console.log(`  開始年: ${p.current_start_year || 'N/A'}`);
  console.log(`  終了年: ${p.current_end_year || 'N/A'}`);
  console.log(`  追加年: ${p.current_additional_years ? JSON.stringify(p.current_additional_years) : 'N/A'}`);
  console.log(`  信頼度: ${p.current_reliability}`);
  console.log('');

  console.log('【変更後】');
  console.log(`  時代設定: ${p.proposed_period}`);
  console.log(`  開始年: ${p.proposed_start_year || 'N/A'}`);
  console.log(`  終了年: ${p.proposed_end_year || 'N/A'}`);
  console.log(`  追加年: ${p.proposed_additional_years ? JSON.stringify(p.proposed_additional_years) : 'N/A'}`);
  console.log(`  信頼度: ${p.proposed_reliability}`);
  console.log('');

  console.log('🤖 検証理由:');
  console.log(`  ${p.validation_reasoning}`);
  console.log('');

  console.log('📚 根拠:');
  if (p.validation_evidence && p.validation_evidence.length > 0) {
    p.validation_evidence.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  } else {
    console.log('  （なし）');
  }
  console.log('');

  const confidence = (p.validation_confidence * 100).toFixed(0);
  console.log(`信頼度スコア: ${confidence}% / 100%`);
  console.log(`検証元: ${p.validation_source}`);
  console.log(`作成日時: ${p.created_at}`);
  console.log('');

  console.log('この変更を承認しますか？');
  console.log(`  承認: node scripts/review-proposals.js --approve ${id}`);
  console.log(`  却下: node scripts/review-proposals.js --reject ${id}`);
  console.log('');
}

/**
 * 提案を承認してDBに反映
 */
async function approveProposal(client, id) {
  try {
    await client.query('BEGIN');

    // 提案を取得
    const proposalQuery = `
      SELECT * FROM validation_proposals WHERE id = $1 AND status = 'pending'
    `;
    const proposalResult = await client.query(proposalQuery, [id]);

    if (proposalResult.rows.length === 0) {
      console.log(`❌ 提案ID ${id} が見つからないか、既に処理済みです`);
      await client.query('ROLLBACK');
      return;
    }

    const proposal = proposalResult.rows[0];

    // movie_time_periodsを更新
    const updateQuery = `
      UPDATE movie_time_periods
      SET
        start_year = $1,
        end_year = $2,
        period = $3,
        additional_years = $4,
        reliability = $5,
        source = $6,
        updated_at = NOW()
      WHERE id = $7
    `;

    await client.query(updateQuery, [
      proposal.proposed_start_year,
      proposal.proposed_end_year,
      proposal.proposed_period,
      proposal.proposed_additional_years,
      proposal.proposed_reliability,
      proposal.validation_source,
      proposal.movie_time_period_id
    ]);

    // 提案を承認済みに変更
    const approveQuery = `
      UPDATE validation_proposals
      SET
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = 'admin'
      WHERE id = $1
    `;

    await client.query(approveQuery, [id]);

    await client.query('COMMIT');

    console.log(`✅ 提案ID ${id} を承認し、DBに反映しました`);
    console.log(`   ${proposal.title}: ${proposal.current_period} → ${proposal.proposed_period}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ エラー: ${error.message}`);
  }
}

/**
 * 提案を却下
 */
async function rejectProposal(client, id) {
  const query = `
    UPDATE validation_proposals
    SET
      status = 'rejected',
      reviewed_at = NOW(),
      reviewed_by = 'admin'
    WHERE id = $1 AND status = 'pending'
    RETURNING title
  `;

  const result = await client.query(query, [id]);

  if (result.rows.length === 0) {
    console.log(`❌ 提案ID ${id} が見つからないか、既に処理済みです`);
    return;
  }

  console.log(`❌ 提案ID ${id} を却下しました`);
  console.log(`   ${result.rows[0].title}`);
}

/**
 * 高信頼度（0.9+）の提案をすべて承認
 */
async function approveAllHighConfidence(client) {
  const query = `
    SELECT id, title, validation_confidence
    FROM validation_proposals
    WHERE status = 'pending' AND validation_confidence >= 0.9
    ORDER BY validation_confidence DESC
  `;

  const result = await client.query(query);
  const proposals = result.rows;

  if (proposals.length === 0) {
    console.log('ℹ️  高信頼度（90%+）の提案はありません');
    return;
  }

  console.log(`🔄 ${proposals.length}件の高信頼度提案を承認します...\n`);

  for (const proposal of proposals) {
    const confidence = (proposal.validation_confidence * 100).toFixed(0);
    console.log(`[${proposal.id}] ${proposal.title} (${confidence}%)`);
    await approveProposal(client, proposal.id);
  }

  console.log(`\n✅ ${proposals.length}件の提案を承認しました`);
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
    await client.connect();

    if (APPROVE_ALL) {
      await approveAllHighConfidence(client);
    } else if (APPROVE_ID) {
      await approveProposal(client, APPROVE_ID);
    } else if (REJECT_ID) {
      await rejectProposal(client, REJECT_ID);
    } else if (PROPOSAL_ID) {
      await showProposalDetail(client, PROPOSAL_ID);
    } else {
      await listProposals(client);
    }
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

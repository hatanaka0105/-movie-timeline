/**
 * 検証結果をGitHub Pull Requestとして作成
 *
 * validation_proposalsテーブルからpendingの提案を取得し、
 * PRとして自動作成します。
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('📡 データベースに接続しました\n');

    // pending状態の提案を取得
    const query = `
      SELECT
        id,
        tmdb_id,
        title,
        current_start_year,
        current_end_year,
        current_period,
        current_reliability,
        proposed_start_year,
        proposed_end_year,
        proposed_period,
        proposed_reliability,
        validation_confidence,
        validation_reasoning,
        validation_evidence
      FROM validation_proposals
      WHERE status = 'pending'
      ORDER BY validation_confidence DESC, created_at DESC
    `;

    const result = await client.query(query);
    const proposals = result.rows;

    if (proposals.length === 0) {
      console.log('✅ 保留中の提案はありません');
      return;
    }

    console.log(`📋 ${proposals.length}件の提案を検出しました\n`);

    // ブランチ名を生成
    const branchName = `validation/time-periods-${Date.now()}`;
    const timestamp = new Date().toISOString().split('T')[0];

    // 新しいブランチを作成
    console.log(`🌿 ブランチを作成: ${branchName}`);
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // 提案内容をJSONファイルとして保存
    const proposalsData = {
      timestamp,
      proposals: proposals.map(p => ({
        id: p.id,
        tmdb_id: p.tmdb_id,
        title: p.title,
        current: {
          start_year: p.current_start_year,
          end_year: p.current_end_year,
          period: p.current_period,
          reliability: p.current_reliability
        },
        proposed: {
          start_year: p.proposed_start_year,
          end_year: p.proposed_end_year,
          period: p.proposed_period,
          reliability: p.proposed_reliability
        },
        validation: {
          confidence: p.validation_confidence,
          reasoning: p.validation_reasoning,
          evidence: p.validation_evidence
        }
      }))
    };

    const jsonPath = '.github/validation-proposals.json';
    fs.writeFileSync(jsonPath, JSON.stringify(proposalsData, null, 2));
    console.log(`📝 提案を保存: ${jsonPath}`);

    // PR本文を生成
    const prBody = generatePRBody(proposals, timestamp);
    const prBodyPath = '.github/pr-body.md';
    fs.writeFileSync(prBodyPath, prBody);

    // ファイルをコミット
    execSync('git add .github/validation-proposals.json', { stdio: 'inherit' });
    execSync(`git commit -m "Add validation proposals for ${timestamp}"`, { stdio: 'inherit' });

    // プッシュ
    console.log(`\n📤 ブランチをプッシュ: ${branchName}`);
    execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });

    // PRを作成
    console.log('\n🔀 Pull Requestを作成中...');
    const prTitle = `時代設定の検証提案 (${proposals.length}件) - ${timestamp}`;

    try {
      const prUrl = execSync(
        `gh pr create --title "${prTitle}" --body-file "${prBodyPath}" --base main --head ${branchName}`,
        { encoding: 'utf-8' }
      ).trim();

      console.log('\n✅ Pull Requestが作成されました！');
      console.log(`🔗 ${prUrl}`);
      console.log('\n次のステップ:');
      console.log('  1. 上記のURLでPRを確認');
      console.log('  2. 内容を確認して承認する場合は "Merge pull request"');
      console.log('  3. 却下する場合は "Close pull request"');
    } catch (error) {
      console.error('\n❌ PR作成エラー:', error.message);
      console.log('\ngh CLIがインストールされていない可能性があります。');
      console.log('手動でPRを作成してください:');
      console.log(`  ブランチ: ${branchName}`);
      console.log(`  タイトル: ${prTitle}`);
    }

    // mainブランチに戻る
    execSync('git checkout main', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

/**
 * PR本文を生成
 */
function generatePRBody(proposals, timestamp) {
  let body = `# 時代設定の検証提案\n\n`;
  body += `**検証日時**: ${timestamp}\n`;
  body += `**提案件数**: ${proposals.length}件\n\n`;
  body += `## 概要\n\n`;
  body += `DeepSeek-V3による自動検証で以下の${proposals.length}件の時代設定について変更提案があります。\n\n`;
  body += `---\n\n`;

  proposals.forEach((proposal, index) => {
    const confidencePercent = Math.round(proposal.validation_confidence * 100);
    const confidenceEmoji = proposal.validation_confidence >= 0.9 ? '🟢' :
                           proposal.validation_confidence >= 0.7 ? '🟡' : '🟠';

    body += `## ${index + 1}. ${proposal.title}\n\n`;
    body += `${confidenceEmoji} **信頼度**: ${confidencePercent}% | **TMDb ID**: ${proposal.tmdb_id}\n\n`;

    body += `### 現在のDB値\n`;
    body += `- **時代設定**: ${proposal.current_period}\n`;
    if (proposal.current_start_year) body += `- **開始年**: ${proposal.current_start_year}\n`;
    if (proposal.current_end_year) body += `- **終了年**: ${proposal.current_end_year}\n`;
    body += `- **信頼度**: ${proposal.current_reliability}\n\n`;

    body += `### 提案する変更\n`;
    body += `- **時代設定**: ${proposal.proposed_period}\n`;
    if (proposal.proposed_start_year) body += `- **開始年**: ${proposal.proposed_start_year}\n`;
    if (proposal.proposed_end_year) body += `- **終了年**: ${proposal.proposed_end_year}\n`;
    body += `- **信頼度**: ${proposal.proposed_reliability}\n\n`;

    body += `### 変更理由\n`;
    body += `${proposal.validation_reasoning}\n\n`;

    if (proposal.validation_evidence && proposal.validation_evidence.length > 0) {
      body += `### 参考資料\n`;
      proposal.validation_evidence.forEach(url => {
        body += `- ${url}\n`;
      });
      body += `\n`;
    }

    body += `---\n\n`;
  });

  body += `## 承認方法\n\n`;
  body += `- ✅ **承認する場合**: このPRをマージしてください。自動的にデータベースが更新されます。\n`;
  body += `- ❌ **却下する場合**: このPRをクローズしてください。提案は保存されたままになります。\n\n`;
  body += `---\n\n`;
  body += `🤖 この提案は [GitHub Actions](../.github/workflows/validate-time-periods.yml) により自動生成されました。\n`;

  return body;
}

main();

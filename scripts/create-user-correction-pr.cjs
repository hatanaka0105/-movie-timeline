/**
 * ユーザー申告からPull Requestを作成
 *
 * user_correctionsテーブルから承認された申告を取得し、
 * PRとして自動作成します。
 *
 * 使用方法:
 *   node scripts/create-user-correction-pr.cjs --ids 1,2,3
 *   node scripts/create-user-correction-pr.cjs --tmdb-id 27205
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

// コマンドライン引数のパース
const args = process.argv.slice(2);
const idsIndex = args.indexOf('--ids');
const tmdbIndex = args.indexOf('--tmdb-id');

let correctionIds = [];
let tmdbId = null;

if (idsIndex !== -1) {
  correctionIds = args[idsIndex + 1].split(',').map(id => parseInt(id.trim()));
} else if (tmdbIndex !== -1) {
  tmdbId = parseInt(args[tmdbIndex + 1]);
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('📡 データベースに接続しました\n');

    // 申告を取得
    let query, params;

    if (correctionIds.length > 0) {
      const placeholders = correctionIds.map((_, i) => `$${i + 1}`).join(', ');
      query = `
        SELECT * FROM user_corrections
        WHERE id IN (${placeholders}) AND status = 'pending'
        ORDER BY created_at DESC
      `;
      params = correctionIds;
    } else if (tmdbId) {
      query = `
        SELECT * FROM user_corrections
        WHERE tmdb_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
      `;
      params = [tmdbId];
    } else {
      // すべてのpending申告
      query = `
        SELECT * FROM user_corrections
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 20
      `;
      params = [];
    }

    const result = await client.query(query, params);
    const corrections = result.rows;

    if (corrections.length === 0) {
      console.log('✅ 該当する申告がありません');
      return;
    }

    console.log(`📋 ${corrections.length}件の申告からPRを作成します\n`);

    // ブランチ名を生成
    const branchName = `user-corrections/${Date.now()}`;
    const timestamp = new Date().toISOString().split('T')[0];

    // 新しいブランチを作成
    console.log(`🌿 ブランチを作成: ${branchName}`);
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // 申告内容をJSONファイルとして保存
    const correctionsData = {
      timestamp,
      source: 'user_corrections',
      corrections: corrections.map(c => ({
        id: c.id,
        tmdb_id: c.tmdb_id,
        title: c.title,
        current: {
          start_year: c.current_start_year,
          end_year: c.current_end_year,
          period: c.current_period,
          reliability: c.current_reliability
        },
        suggested: {
          start_year: c.suggested_start_year,
          end_year: c.suggested_end_year,
          period: c.suggested_period
        },
        user_reason: c.user_reason,
        created_at: c.created_at
      }))
    };

    const jsonPath = '.github/user-corrections.json';
    fs.writeFileSync(jsonPath, JSON.stringify(correctionsData, null, 2));
    console.log(`📝 申告を保存: ${jsonPath}`);

    // PR本文を生成
    const prBody = generatePRBody(corrections, timestamp);
    const prBodyPath = '.github/pr-body-user.md';
    fs.writeFileSync(prBodyPath, prBody);

    // ファイルをコミット
    execSync('git add .github/user-corrections.json', { stdio: 'inherit' });
    execSync(`git commit -m "Add user corrections for ${timestamp}"`, { stdio: 'inherit' });

    // プッシュ
    console.log(`\n📤 ブランチをプッシュ: ${branchName}`);
    execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });

    // PRを作成
    console.log('\n🔀 Pull Requestを作成中...');
    const prTitle = `ユーザー申告による時代設定の修正 (${corrections.length}件) - ${timestamp}`;

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
      console.log('\n手動でPRを作成してください:');
      console.log(`  ブランチ: ${branchName}`);
      console.log(`  タイトル: ${prTitle}`);
    }

    // mainブランチに戻る
    execSync('git checkout main', { stdio: 'inherit' });

    // 申告のステータスを更新（PRが作成されたことを記録）
    for (const correction of corrections) {
      await client.query(
        `UPDATE user_corrections SET status = 'in_review' WHERE id = $1`,
        [correction.id]
      );
    }

    console.log('\n✨ 申告のステータスを "in_review" に更新しました');

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
function generatePRBody(corrections, timestamp) {
  let body = `# ユーザー申告による時代設定の修正\n\n`;
  body += `**申告日時**: ${timestamp}\n`;
  body += `**申告件数**: ${corrections.length}件\n`;
  body += `**ソース**: ユーザーからの直接申告\n\n`;
  body += `## 概要\n\n`;
  body += `ユーザーから${corrections.length}件の時代設定修正の申告がありました。\n\n`;
  body += `---\n\n`;

  corrections.forEach((correction, index) => {
    body += `## ${index + 1}. ${correction.title}\n\n`;
    body += `**TMDb ID**: ${correction.tmdb_id} | **申告ID**: #${correction.id}\n\n`;

    body += `### 現在のDB値\n`;
    body += `- **時代設定**: ${correction.current_period}\n`;
    if (correction.current_start_year) body += `- **開始年**: ${correction.current_start_year}\n`;
    if (correction.current_end_year) body += `- **終了年**: ${correction.current_end_year}\n`;
    body += `\n`;

    body += `### ユーザーが提案する変更\n`;
    body += `- **時代設定**: ${correction.suggested_period}\n`;
    if (correction.suggested_start_year) body += `- **開始年**: ${correction.suggested_start_year}\n`;
    if (correction.suggested_end_year) body += `- **終了年**: ${correction.suggested_end_year}\n`;
    body += `\n`;

    if (correction.user_reason) {
      body += `### ユーザーの説明\n`;
      body += `> ${correction.user_reason}\n\n`;
    }

    body += `### 申告日時\n`;
    body += `${new Date(correction.created_at).toLocaleString('ja-JP')}\n\n`;
    body += `---\n\n`;
  });

  body += `## 承認方法\n\n`;
  body += `- ✅ **承認する場合**: このPRをマージしてください。自動的にデータベースが更新されます。\n`;
  body += `- ❌ **却下する場合**: このPRをクローズしてください。申告は保存されたままになります。\n\n`;
  body += `---\n\n`;
  body += `👥 この提案はユーザーからの直接申告に基づいて作成されました。\n`;

  return body;
}

main();

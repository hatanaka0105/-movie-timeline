/**
 * 閾値を超えた修正をJSONファイルに書き出す
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const TMDB_ID = parseInt(process.env.TMDB_ID);
const TITLE = process.env.TITLE;
const SUGGESTED_START_YEAR = process.env.SUGGESTED_START_YEAR ? parseInt(process.env.SUGGESTED_START_YEAR) : null;
const SUGGESTED_END_YEAR = process.env.SUGGESTED_END_YEAR ? parseInt(process.env.SUGGESTED_END_YEAR) : null;
const SUGGESTED_PERIOD = process.env.SUGGESTED_PERIOD;

if (!DATABASE_URL || !TMDB_ID || !TITLE || !SUGGESTED_PERIOD) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function generateCorrectionJSON() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // この修正提案のすべてのレコードを取得
    const query = `
      SELECT id, current_start_year, current_end_year, current_period, current_reliability, user_reason
      FROM user_corrections
      WHERE tmdb_id = $1
        AND suggested_start_year IS NOT DISTINCT FROM $2
        AND suggested_end_year IS NOT DISTINCT FROM $3
        AND suggested_period = $4
        AND status = 'pending'
      LIMIT 1
    `;

    const result = await client.query(query, [
      TMDB_ID,
      SUGGESTED_START_YEAR,
      SUGGESTED_END_YEAR,
      SUGGESTED_PERIOD
    ]);

    if (result.rows.length === 0) {
      console.error('❌ No corrections found');
      process.exit(1);
    }

    const correction = result.rows[0];

    // user-corrections.jsonを作成
    const correctionData = {
      generated_at: new Date().toISOString(),
      corrections: [
        {
          id: correction.id,
          tmdb_id: TMDB_ID,
          title: TITLE,
          current: {
            start_year: correction.current_start_year,
            end_year: correction.current_end_year,
            period: correction.current_period,
            reliability: correction.current_reliability
          },
          suggested: {
            start_year: SUGGESTED_START_YEAR,
            end_year: SUGGESTED_END_YEAR,
            period: SUGGESTED_PERIOD
          },
          user_reason: correction.user_reason
        }
      ]
    };

    const outputPath = path.join(__dirname, '..', '.github', 'user-corrections.json');
    fs.writeFileSync(outputPath, JSON.stringify(correctionData, null, 2));

    console.log('✅ Generated user-corrections.json');
    console.log(JSON.stringify(correctionData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generateCorrectionJSON();

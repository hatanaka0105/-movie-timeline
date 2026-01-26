/**
 * 本番環境で大量の映画を自動追加するスクリプト v2
 * 使い方: node scripts/add-movies-bulk-v2.js
 */

import puppeteer from 'puppeteer';

// 追加する映画リスト（時代順）
const MOVIES_TO_ADD = [
  // 古代（紀元前～500年） - Troy, Spartacusは追加済み
  'Gladiator',
  'Cleopatra',
  'The Ten Commandments',
  'Alexander',

  // 中世（500年～1500年）
  'Kingdom of Heaven',
  'Robin Hood',
  'The Messenger: The Story of Joan of Arc',
  'El Cid',
  'Ivanhoe',

  // 近世（1500年～1800年）
  'Elizabeth',
  'The Other Boleyn Girl',
  'Marie Antoinette',
  'Barry Lyndon',
  'The Patriot',
  'Master and Commander',

  // 19世紀（1800年～1900年）
  'Les Misérables',
  'Anna Karenina',
  'The Age of Innocence',
  'Gangs of New York',
  'The Illusionist',
  'The Prestige',

  // 20世紀前半（1900年～1950年）
  'Gone with the Wind',
  'Casablanca',
  'The Great Gatsby',
  'Lawrence of Arabia',
  'Doctor Zhivago',
  'The Bridge on the River Kwai',
  'Patton',
  'Midway',
  'Tora! Tora! Tora!',
  'The Longest Day',
  'A Bridge Too Far',
  'The Great Escape',
  'The Dirty Dozen',
  'Hacksaw Ridge',
  'Fury',
  'Valkyrie',
  'Downfall',
  'Das Boot',
  'Life is Beautiful',
  'Jojo Rabbit',
  'Inglourious Basterds',
  'The Imitation Game',
  'Darkest Hour',
  'Churchill',
  'The King\'s Speech',
  'All Quiet on the Western Front',
  '1917',

  // 20世紀後半（1950年～2000年）
  'The Godfather',
  'Apocalypse Now',
  'Full Metal Jacket',
  'Platoon',
  'The Deer Hunter',
  'Good Morning, Vietnam',
  'Apollo 13',
  'Hidden Figures',
  'The Right Stuff',
  'October Sky',
  'Wall Street',
  'Scarface',
  'Goodfellas',
  'Casino',
  'Catch Me If You Can',
  'American Gangster',
  'Boogie Nights',
  'The Aviator',
  'Public Enemies',
  'Lincoln',
  '12 Years a Slave',
  'Selma',
  'Malcolm X',
  'JFK',
  'Nixon',
  'All the President\'s Men',
  'The Post',

  // 21世紀（2000年～）
  'Black Hawk Down',
  'The Hurt Locker',
  'Zero Dark Thirty',
  'American Sniper',
  'Lone Survivor',
  '13 Hours',
  'The Big Short',
  'The Wolf of Wall Street',
  'The Founder',
  'Steve Jobs',
  'The Social Network',
  'Moneyball',
  'Vice',
  'The Report',
  'Official Secrets',
  'Spotlight',
  'The Fifth Estate',
  'Snowden',
  'Captain Phillips',
  'Sully',
  'First Man',
  'Dunkirk',
  'Oppenheimer',
  'The Last Samurai',
  'Hotel Rwanda',
  'Blood Diamond',
  'The Constant Gardener',
  'City of God',
  'Argo',
  'Munich',
];

async function addMovie(page, movieTitle) {
  try {
    console.log(`\n処理中: ${movieTitle}`);

    // 検索ボックスを見つける
    const searchBox = await page.waitForSelector('input[type="text"][placeholder*="映画タイトル"]', {
      timeout: 5000
    });

    // 検索ボックスをクリアして入力
    await searchBox.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await searchBox.type(movieTitle, { delay: 30 });

    // 検索結果が表示されるまで待機
    console.log('検索結果を待機中...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 検索結果のコンテナを確認
    const hasResults = await page.evaluate(() => {
      const resultsText = document.body.textContent;
      return resultsText.includes('結果が見つかりました') || resultsText.includes('件の結果');
    });

    if (!hasResults) {
      console.log(`✗ 検索結果なし: ${movieTitle}`);
      return false;
    }

    // 最初の結果の追加ボタンを探してクリック
    const clicked = await page.evaluate(() => {
      // 検索結果内の全てのボタンを取得
      const buttons = Array.from(document.querySelectorAll('button'));

      // 検索結果リスト内の「+」ボタンを探す（可視で、検索結果エリア内のもの）
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        // 「+」ボタンで、かつ表示されているもの
        if ((text === '+' || text === '＋') && btn.offsetParent !== null) {
          // 検索結果エリア内にあるか確認
          const searchArea = btn.closest('[class*="search"]') || btn.closest('div');
          if (searchArea) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });

    if (clicked) {
      console.log(`✓ 追加成功: ${movieTitle}`);

      // 年代測定が完了するまで待機
      await new Promise(resolve => setTimeout(resolve, 4000));
      return true;
    } else {
      console.log(`✗ 追加ボタンが見つかりません: ${movieTitle}`);
      return false;
    }

  } catch (error) {
    console.error(`✗ エラー (${movieTitle}):`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('映画一括追加スクリプト v2');
  console.log('='.repeat(60));
  console.log(`追加する映画数: ${MOVIES_TO_ADD.length}本\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox'],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    console.log('本番環境に接続中...');
    await page.goto('https://movie-timeline-three.vercel.app/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✓ 本番環境に接続しました\n');
    console.log('処理を開始します...\n');

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    // 各映画を順番に追加
    for (let i = 0; i < MOVIES_TO_ADD.length; i++) {
      const movie = MOVIES_TO_ADD[i];
      console.log(`[${i + 1}/${MOVIES_TO_ADD.length}] ${movie}`);

      const success = await addMovie(page, movie);

      if (success) {
        successCount++;
      } else {
        failCount++;
        failed.push(movie);
      }

      // 10本ごとに進捗報告
      if ((i + 1) % 10 === 0) {
        console.log('\n' + '='.repeat(60));
        console.log(`進捗: ${i + 1}/${MOVIES_TO_ADD.length}本完了`);
        console.log(`成功: ${successCount}本 | 失敗: ${failCount}本`);
        console.log(`成功率: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
        console.log('='.repeat(60) + '\n');
      }

      // サーバー負荷を考慮して小休止
      if ((i + 1) % 5 === 0) {
        console.log('(小休止中...)\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 最終結果
    console.log('\n' + '='.repeat(60));
    console.log('最終結果');
    console.log('='.repeat(60));
    console.log(`処理完了: ${MOVIES_TO_ADD.length}本`);
    console.log(`成功: ${successCount}本`);
    console.log(`失敗: ${failCount}本`);
    console.log(`成功率: ${((successCount / MOVIES_TO_ADD.length) * 100).toFixed(1)}%`);

    if (failed.length > 0) {
      console.log('\n失敗した映画:');
      failed.forEach(movie => console.log(`  - ${movie}`));
    }

    console.log('='.repeat(60));

    // スクリーンショット撮影
    await page.screenshot({
      path: 'bulk-add-result-v2.png',
      fullPage: true
    });
    console.log('\n✓ スクリーンショット保存: bulk-add-result-v2.png');

    console.log('\nブラウザは開いたままにします。確認後、Ctrl+Cで終了してください。');

  } catch (error) {
    console.error('\n致命的エラー:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('スクリプト実行エラー:', error);
  process.exit(1);
});
